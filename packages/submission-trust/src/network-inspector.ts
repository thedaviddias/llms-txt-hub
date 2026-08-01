import { lookup } from 'node:dns/promises'
import { request } from 'node:https'
import { isIP } from 'node:net'

import {
  SUBMISSION_ACCEPT_ENCODING,
  SUBMISSION_ASSESSMENT_TIMEOUT_MS,
  SUBMISSION_MAX_REDIRECTS,
  SUBMISSION_REQUEST_TIMEOUT_MS
} from './constants.js'
import type {
  ReputationResult,
  ResourceInspectionFailure,
  ResourceInspectionResult
} from './types.js'
import { isPublicIpAddress, validateSubmissionUrl } from './url-policy.js'

const USER_AGENT = 'llms-txt-hub-submission-inspector/1.0'
const REDIRECT_STATUSES = new Set([301, 302, 303, 307, 308])

type InspectionReasonCode = Extract<ResourceInspectionResult, { ok: false }>['reasonCode']

/** DNS answer consumed by the pinned network inspector. */
export interface ResolvedAddress {
  readonly address: string
  readonly family: number
}

/** Request passed to a transport after the destination has passed URL and DNS policy. */
export interface PinnedTransportRequest {
  readonly address: string
  readonly family: 4 | 6
  readonly headers: Readonly<Record<string, string>>
  readonly hostname: string
  readonly servername: string
  readonly timeoutMs: number
  readonly url: string
}

/** Bounded response stream returned by a pinned transport implementation. */
export interface PinnedTransportResponse {
  readonly body: AsyncIterable<Uint8Array>
  readonly discard?: () => void
  readonly headers: Readonly<Record<string, string | undefined>>
  readonly statusCode: number
}

/** Dependencies that make DNS, reputation, transport, time, and timers deterministic. */
export interface NetworkInspectorDependencies {
  readonly checkReputation: (url: string) => Promise<ReputationResult>
  readonly now: () => Date
  readonly resolve: (hostname: string) => Promise<readonly ResolvedAddress[]>
  readonly runWithTimeout: <Value>(
    operation: () => Promise<Value>,
    timeoutMs: number
  ) => Promise<Value>
  readonly transport: (request: PinnedTransportRequest) => Promise<PinnedTransportResponse>
}

/** Caller-provided response limits for one inspected resource. */
export interface NetworkInspectionOptions {
  readonly maxBytes: number
  readonly optional?: boolean
}

/** Inspector API that validates and pins every outbound request hop. */
export interface NetworkInspector {
  inspect: (url: string, options: NetworkInspectionOptions) => Promise<ResourceInspectionResult>
}

const safeFailure = (
  kind: ResourceInspectionFailure['kind'],
  reasonCode: InspectionReasonCode,
  safeMessage: string,
  evidence: ResourceInspectionFailure['evidence'] = {}
): ResourceInspectionResult => ({
  failure: { evidence, kind, safeMessage },
  ok: false,
  reasonCode
})

const redirectFailure = (): ResourceInspectionResult =>
  safeFailure(
    'redirect_policy_failure',
    'unsafe_network_target',
    'The resource redirect could not be followed safely.',
    { evidenceId: 'redirect-policy-rejected' }
  )

const transportFailure = (statusCode?: number): ResourceInspectionResult =>
  safeFailure(
    'transport_failure',
    'required_resource_transient_failure',
    'The resource could not be inspected.',
    statusCode === undefined ? {} : { statusCode }
  )

const defaultResolve = async (hostname: string): Promise<readonly ResolvedAddress[]> =>
  lookup(hostname, { all: true, verbatim: true })

const defaultRunWithTimeout = async <Value>(
  operation: () => Promise<Value>,
  timeoutMs: number
): Promise<Value> => {
  let timer: ReturnType<typeof setTimeout> | undefined
  const timeout = new Promise<never>((_resolve, reject) => {
    timer = setTimeout(() => reject(new Error('submission-inspection-timeout')), timeoutMs)
  })

  try {
    return await Promise.race([operation(), timeout])
  } finally {
    if (timer) {
      clearTimeout(timer)
    }
  }
}

const defaultTransport = (details: PinnedTransportRequest): Promise<PinnedTransportResponse> =>
  new Promise((resolve, reject) => {
    const url = new URL(details.url)
    const outbound = request(
      {
        agent: false,
        headers: details.headers,
        hostname: details.hostname,
        lookup: (_hostname, _options, callback) => {
          if (_options.all) {
            callback(null, [{ address: details.address, family: details.family }])
            return
          }
          callback(null, details.address, details.family)
        },
        method: 'GET',
        path: `${url.pathname}${url.search}`,
        port: 443,
        servername: details.servername
      },
      response => {
        const contentEncoding = response.headers['content-encoding']
        const contentType = response.headers['content-type']
        const location = response.headers.location
        resolve({
          body: response,
          discard: () => response.destroy(),
          headers: {
            'content-encoding': Array.isArray(contentEncoding)
              ? contentEncoding.join(', ')
              : contentEncoding,
            'content-type': Array.isArray(contentType) ? contentType.join(', ') : contentType,
            location: Array.isArray(location) ? location[0] : location
          },
          statusCode: response.statusCode ?? 0
        })
      }
    )

    outbound.setTimeout(details.timeoutMs, () => {
      outbound.destroy(new Error('submission-request-timeout'))
    })
    outbound.once('error', reject)
    outbound.end()
  })

const DEFAULT_DEPENDENCIES: NetworkInspectorDependencies = {
  checkReputation: async () => ({
    checkedAt: new Date().toISOString(),
    reason: 'No reputation checker was configured.',
    status: 'unknown'
  }),
  now: () => new Date(),
  resolve: defaultResolve,
  runWithTimeout: defaultRunWithTimeout,
  transport: defaultTransport
}

const validatedFamily = (family: number): 4 | 6 | null => {
  if (family === 4 || family === 6) {
    return family
  }
  return null
}

const contentEncodingIsAllowed = (value: string | undefined): boolean =>
  !value || value.trim().toLowerCase() === SUBMISSION_ACCEPT_ENCODING

const createPinnedRequest = (
  address: string,
  family: 4 | 6,
  url: URL,
  normalizedUrl: string
): PinnedTransportRequest => ({
  address,
  family,
  headers: {
    'accept-encoding': SUBMISSION_ACCEPT_ENCODING,
    'user-agent': USER_AGENT
  },
  hostname: url.hostname,
  servername: url.hostname,
  timeoutMs: SUBMISSION_REQUEST_TIMEOUT_MS,
  url: normalizedUrl
})

const collectBody = async (
  body: AsyncIterable<Uint8Array>,
  maxBytes: number
): Promise<{ body?: string; byteCount: number } | null> => {
  const bodyChunks: Uint8Array[] = []
  let byteCount = 0

  for await (const chunk of body) {
    byteCount += chunk.byteLength
    if (byteCount > maxBytes) {
      return null
    }
    bodyChunks.push(chunk)
  }

  return {
    body: bodyChunks.length > 0 ? Buffer.concat(bodyChunks).toString('utf8') : undefined,
    byteCount
  }
}

const reputationFailure = (reputation: ReputationResult): ResourceInspectionResult | null => {
  if (reputation.status === 'safe') {
    return null
  }
  if (reputation.status === 'unsafe') {
    return safeFailure(
      'reputation_match',
      'reputation_match',
      'The resource was reported as unsafe.',
      {
        checkedAt: reputation.checkedAt,
        providerStatus: 'unsafe',
        threatTypes: reputation.threatTypes
      }
    )
  }
  return safeFailure(
    'reputation_unknown',
    'reputation_unknown',
    'The resource reputation could not be verified.',
    { checkedAt: reputation.checkedAt, providerStatus: 'unknown' }
  )
}

/**
 * Creates a fail-closed network inspector with injectable deterministic boundaries.
 *
 * Each hop is normalized, fully resolved, public-address checked, reputation checked,
 * and connected through exactly one pinned address before any response bytes are read.
 */
export const createNetworkInspector = (
  dependencyOverrides: Partial<NetworkInspectorDependencies> = {}
): NetworkInspector => {
  const dependencies: NetworkInspectorDependencies = {
    ...DEFAULT_DEPENDENCIES,
    ...dependencyOverrides
  }

  return {
    inspect: async (submittedUrl, options) => {
      try {
        return await dependencies.runWithTimeout(async () => {
          const initial = validateSubmissionUrl(submittedUrl)
          if (!initial.ok) {
            return redirectFailure()
          }

          const requestedUrl = initial.normalizedUrl
          let currentUrl = requestedUrl
          const redirectUrls: string[] = []
          const visited = new Set([requestedUrl])

          while (true) {
            const normalized = validateSubmissionUrl(currentUrl)
            if (!normalized.ok) {
              return redirectFailure()
            }

            let addresses: readonly ResolvedAddress[]
            try {
              addresses = await dependencies.resolve(normalized.url.hostname)
            } catch {
              return transportFailure()
            }

            const validatedAddresses = addresses.map(answer => ({
              address: answer.address,
              family: validatedFamily(answer.family),
              public:
                isPublicIpAddress(answer.address) &&
                isIP(answer.address) === validatedFamily(answer.family)
            }))
            if (
              validatedAddresses.length === 0 ||
              validatedAddresses.some(answer => answer.family === null || !answer.public)
            ) {
              return safeFailure(
                'dns_rejected',
                'unsafe_network_target',
                'The resource host could not be safely inspected.',
                {
                  checkedAt: dependencies.now().toISOString(),
                  evidenceId: 'dns-public-address-required',
                  finalHost: normalized.url.hostname
                }
              )
            }

            let reputation: ReputationResult
            try {
              reputation = await dependencies.checkReputation(normalized.normalizedUrl)
            } catch {
              return safeFailure(
                'reputation_unknown',
                'reputation_unknown',
                'The resource reputation could not be verified.',
                { checkedAt: dependencies.now().toISOString(), providerStatus: 'unknown' }
              )
            }
            const unsafeReputation = reputationFailure(reputation)
            if (unsafeReputation) {
              return unsafeReputation
            }

            const selected = validatedAddresses[0]
            const selectedFamily = selected?.family
            if (!selected || selectedFamily === null || selectedFamily === undefined) {
              return transportFailure()
            }

            let timedTransport:
              | { readonly ok: true; readonly response: PinnedTransportResponse }
              | { readonly ok: false }
            try {
              timedTransport = await dependencies.runWithTimeout(async () => {
                try {
                  const response = await dependencies.transport(
                    createPinnedRequest(
                      selected.address,
                      selectedFamily,
                      normalized.url,
                      normalized.normalizedUrl
                    )
                  )
                  return { ok: true, response }
                } catch {
                  return { ok: false }
                }
              }, SUBMISSION_REQUEST_TIMEOUT_MS)
            } catch {
              return safeFailure(
                'timeout',
                'required_resource_transient_failure',
                'The resource inspection timed out.',
                { durationBucket: 'over_5s' }
              )
            }
            if (!timedTransport.ok) {
              return transportFailure()
            }
            const response = timedTransport.response

            if (!contentEncodingIsAllowed(response.headers['content-encoding'])) {
              response.discard?.()
              return transportFailure(response.statusCode)
            }

            if (REDIRECT_STATUSES.has(response.statusCode)) {
              const location = response.headers.location
              if (!location || redirectUrls.length >= SUBMISSION_MAX_REDIRECTS) {
                response.discard?.()
                return redirectFailure()
              }

              let destination: URL
              try {
                destination = new URL(location, normalized.normalizedUrl)
              } catch {
                response.discard?.()
                return redirectFailure()
              }
              const redirect = validateSubmissionUrl(destination.href)
              if (!redirect.ok || visited.has(redirect.normalizedUrl)) {
                response.discard?.()
                return redirectFailure()
              }

              response.discard?.()
              visited.add(redirect.normalizedUrl)
              redirectUrls.push(redirect.normalizedUrl)
              currentUrl = redirect.normalizedUrl
              continue
            }

            let collected: Awaited<ReturnType<typeof collectBody>>
            try {
              collected = await collectBody(response.body, options.maxBytes)
            } catch {
              response.discard?.()
              return transportFailure(response.statusCode)
            }
            if (!collected) {
              response.discard?.()
              return safeFailure(
                'oversized_content',
                options.optional ? 'invalid_optional_resource' : 'required_resource_missing',
                'The resource response was too large.',
                { byteCount: options.maxBytes + 1 }
              )
            }

            return {
              ok: true,
              resource: {
                body: collected.body,
                byteCount: collected.byteCount,
                contentType: response.headers['content-type'],
                finalUrl: normalized.normalizedUrl,
                redirectUrls,
                reputation,
                requestedUrl,
                statusCode: response.statusCode
              }
            }
          }
        }, SUBMISSION_ASSESSMENT_TIMEOUT_MS)
      } catch {
        return safeFailure(
          'timeout',
          'required_resource_transient_failure',
          'The resource inspection timed out.',
          { durationBucket: 'over_5s' }
        )
      }
    }
  }
}
