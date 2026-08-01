import { lookup } from 'node:dns/promises'
import { isIP } from 'node:net'

import {
  SUBMISSION_ACCEPT_ENCODING,
  SUBMISSION_ASSESSMENT_TIMEOUT_MS,
  SUBMISSION_MAX_REDIRECTS,
  SUBMISSION_REQUEST_TIMEOUT_MS,
  WEB_RISK_FRESHNESS_MS
} from './constants.js'
import { createNodeHttpsTransport } from './node-https-transport.js'
import type {
  NetworkInspectionOptions,
  NetworkInspector,
  NetworkInspectorDependencies,
  PinnedTransportRequest,
  PinnedTransportResponse,
  ReputationResult,
  ResolvedAddress,
  ResourceInspectionFailure,
  ResourceInspectionResult,
  ResourceReputationCheck
} from './types.js'
import { isPublicIpAddress, validateSubmissionUrl } from './url-policy.js'

const USER_AGENT = 'llms-txt-hub-submission-inspector/1.0'
const REDIRECT_STATUSES = new Set([301, 302, 303, 307, 308])
type InspectionReasonCode = Extract<ResourceInspectionResult, { ok: false }>['reasonCode']
type SafeReputation = Extract<ReputationResult, { status: 'safe' }>
type Dependencies = NetworkInspectorDependencies
type RequestDetails = PinnedTransportRequest
type ResponseDetails = PinnedTransportResponse
type Result = ResourceInspectionResult

interface SelectedAddress {
  address: string
  family: 4 | 6
}

interface CollectedBody {
  body?: string
  byteCount: number
}

type HopResult =
  | { kind: 'failure'; result: Result }
  | { kind: 'redirect'; url: string }
  | { collected: CollectedBody; contentType?: string; kind: 'success'; statusCode: number }

const safeFailure = (
  kind: ResourceInspectionFailure['kind'],
  reasonCode: InspectionReasonCode,
  safeMessage: string,
  evidence: ResourceInspectionFailure['evidence'] = {}
): Result => ({ failure: { evidence, kind, safeMessage }, ok: false, reasonCode })

const timeoutFailure = (): Result =>
  safeFailure(
    'timeout',
    'required_resource_transient_failure',
    'The resource inspection timed out.',
    {
      durationBucket: 'over_5s'
    }
  )
const redirectFailure = (): Result =>
  safeFailure(
    'redirect_policy_failure',
    'unsafe_network_target',
    'The resource redirect could not be followed safely.',
    { evidenceId: 'redirect-policy-rejected' }
  )
const transportFailure = (statusCode?: number): Result =>
  safeFailure(
    'transport_failure',
    'required_resource_transient_failure',
    'The resource could not be inspected.',
    statusCode === undefined ? {} : { statusCode }
  )
const throwIfAborted = (signal: AbortSignal): void => {
  if (signal.aborted) throw new Error('submission-inspection-aborted')
}
const raceAbort = async <Value>(
  operation: () => Promise<Value>,
  signal: AbortSignal,
  message: string
): Promise<Value> => {
  throwIfAborted(signal)
  let rejectAbort: ((error: Error) => void) | undefined
  const aborted = new Promise<never>((_resolve, reject) => {
    rejectAbort = reject
  })
  const abort = (): void => rejectAbort?.(new Error(message))
  signal.addEventListener('abort', abort, { once: true })
  try {
    return await Promise.race([operation(), aborted])
  } finally {
    signal.removeEventListener('abort', abort)
  }
}
const defaultResolve = async (hostname: string): Promise<readonly ResolvedAddress[]> =>
  lookup(hostname, { all: true, verbatim: true })

const defaultRunWithTimeout = async <Value>(
  operation: (signal: AbortSignal) => Promise<Value>,
  timeoutMs: number,
  parentSignal?: AbortSignal
): Promise<Value> => {
  const controller = new AbortController()
  const relayAbort = (): void => controller.abort()
  const timer = setTimeout(relayAbort, timeoutMs)
  parentSignal?.addEventListener('abort', relayAbort, { once: true })
  try {
    return await raceAbort(
      () => operation(controller.signal),
      controller.signal,
      'submission-inspection-timeout'
    )
  } finally {
    clearTimeout(timer)
    parentSignal?.removeEventListener('abort', relayAbort)
  }
}

const DEFAULT_DEPENDENCIES: Dependencies = {
  checkReputation: async () => ({
    checkedAt: new Date().toISOString(),
    reason: 'No reputation checker was configured.',
    status: 'unknown'
  }),
  now: () => new Date(),
  resolve: defaultResolve,
  runWithTimeout: defaultRunWithTimeout,
  transport: createNodeHttpsTransport()
}

/**
 * Executes one inspection while preserving per-hop evidence and cancellation state.
 */
class InspectionRunner {
  constructor(
    private readonly dependencies: Dependencies,
    private readonly options: NetworkInspectionOptions
  ) {}

  async inspect(submittedUrl: string, signal: AbortSignal): Promise<Result> {
    const initial = validateSubmissionUrl(submittedUrl)
    if (!initial.ok) return redirectFailure()
    const requestedUrl = initial.normalizedUrl
    let currentUrl = requestedUrl
    const redirects: string[] = []
    const reputationChecks: ResourceReputationCheck[] = []
    const visited = new Set([requestedUrl])

    while (true) {
      throwIfAborted(signal)
      const normalized = validateSubmissionUrl(currentUrl)
      if (!normalized.ok) return redirectFailure()
      const address = await this.resolveAddress(normalized.url.hostname, signal)
      if ('ok' in address) return address
      const reputation = await this.reputation(normalized.normalizedUrl, signal)
      if ('ok' in reputation) return reputation
      reputationChecks.push({ reputation, url: normalized.normalizedUrl })

      let hop: HopResult
      try {
        hop = await this.dependencies.runWithTimeout(
          requestSignal =>
            this.inspectResponse(
              this.pinnedRequest(address, normalized.url, normalized.normalizedUrl, requestSignal),
              redirects.length,
              visited,
              requestSignal
            ),
          SUBMISSION_REQUEST_TIMEOUT_MS,
          signal
        )
      } catch {
        return timeoutFailure()
      }
      if (hop.kind === 'failure') return this.classifyOptionalFailure(hop.result)
      if (hop.kind === 'redirect') {
        throwIfAborted(signal)
        visited.add(hop.url)
        redirects.push(hop.url)
        currentUrl = hop.url
        continue
      }
      return {
        ok: true,
        resource: {
          body: hop.collected.body,
          byteCount: hop.collected.byteCount,
          contentType: hop.contentType,
          finalUrl: normalized.normalizedUrl,
          redirectUrls: redirects,
          reputation,
          reputationChecks,
          requestedUrl,
          statusCode: hop.statusCode
        }
      }
    }
  }

  private async resolveAddress(
    hostname: string,
    signal: AbortSignal
  ): Promise<SelectedAddress | Result> {
    let addresses: readonly ResolvedAddress[]
    try {
      addresses = await this.dependencies.resolve(hostname)
      throwIfAborted(signal)
    } catch {
      throwIfAborted(signal)
      return transportFailure()
    }
    const valid = addresses.map(answer => ({
      address: answer.address,
      family: answer.family === 4 || answer.family === 6 ? answer.family : null,
      public: isPublicIpAddress(answer.address) && isIP(answer.address) === answer.family
    }))
    if (valid.length === 0 || valid.some(answer => answer.family === null || !answer.public)) {
      return safeFailure(
        'dns_rejected',
        'unsafe_network_target',
        'The resource host could not be safely inspected.',
        {
          checkedAt: this.dependencies.now().toISOString(),
          evidenceId: 'dns-public-address-required',
          finalHost: hostname
        }
      )
    }
    const selected = valid[0]
    if (!selected || selected.family === null) return transportFailure()
    if (selected.family === 4) return { address: selected.address, family: 4 }
    if (selected.family === 6) return { address: selected.address, family: 6 }
    return transportFailure()
  }

  private async reputation(url: string, signal: AbortSignal): Promise<SafeReputation | Result> {
    throwIfAborted(signal)
    try {
      const result = await this.dependencies.checkReputation(url)
      throwIfAborted(signal)
      return this.validateReputation(result)
    } catch {
      throwIfAborted(signal)
      return this.reputationUnknown(this.dependencies.now().toISOString())
    }
  }

  private validateReputation(result: ReputationResult): SafeReputation | Result {
    if (result.status === 'unsafe') {
      return safeFailure(
        'reputation_match',
        'reputation_match',
        'The resource was reported as unsafe.',
        {
          checkedAt: result.checkedAt,
          providerStatus: 'unsafe',
          threatTypes: result.threatTypes
        }
      )
    }
    if (result.status === 'unknown') return this.reputationUnknown(result.checkedAt)
    const now = this.dependencies.now().getTime()
    const checked = Date.parse(result.checkedAt)
    const expires = result.expiresAt ? Date.parse(result.expiresAt) : undefined
    if (
      !Number.isFinite(now) ||
      !Number.isFinite(checked) ||
      checked > now ||
      now - checked > WEB_RISK_FRESHNESS_MS ||
      (expires !== undefined && (!Number.isFinite(expires) || expires <= now))
    ) {
      return this.reputationUnknown(result.checkedAt)
    }
    return result
  }

  private reputationUnknown(checkedAt?: string): Result {
    return safeFailure(
      'reputation_unknown',
      'reputation_unknown',
      'The resource reputation could not be verified.',
      checkedAt ? { checkedAt, providerStatus: 'unknown' } : { providerStatus: 'unknown' }
    )
  }

  private pinnedRequest(
    address: SelectedAddress,
    url: URL,
    normalizedUrl: string,
    signal: AbortSignal
  ): RequestDetails {
    return {
      ...address,
      headers: { 'accept-encoding': SUBMISSION_ACCEPT_ENCODING, 'user-agent': USER_AGENT },
      hostname: url.hostname,
      servername: url.hostname,
      signal,
      timeoutMs: SUBMISSION_REQUEST_TIMEOUT_MS,
      url: normalizedUrl
    }
  }

  private async inspectResponse(
    requestDetails: RequestDetails,
    redirectCount: number,
    visited: ReadonlySet<string>,
    signal: AbortSignal
  ): Promise<HopResult> {
    let response: ResponseDetails
    try {
      throwIfAborted(signal)
      response = await this.dependencies.transport(requestDetails)
      throwIfAborted(signal)
    } catch {
      throwIfAborted(signal)
      return { kind: 'failure', result: transportFailure() }
    }
    const encoding = response.headers['content-encoding']
    if (encoding && encoding.trim().toLowerCase() !== SUBMISSION_ACCEPT_ENCODING) {
      response.discard?.()
      return { kind: 'failure', result: transportFailure(response.statusCode) }
    }
    const redirect = this.redirect(response, requestDetails.url, redirectCount, visited, signal)
    if (redirect) {
      response.discard?.()
      return redirect
    }
    const abort = (): void => response.discard?.()
    signal.addEventListener('abort', abort, { once: true })
    try {
      const collected = await this.collectBody(response.body, signal)
      if (!collected) {
        response.discard?.()
        return {
          kind: 'failure',
          result: safeFailure(
            'oversized_content',
            'required_resource_missing',
            'The resource response was too large.',
            { byteCount: this.options.maxBytes + 1 }
          )
        }
      }
      return {
        collected,
        contentType: response.headers['content-type'],
        kind: 'success',
        statusCode: response.statusCode
      }
    } catch {
      response.discard?.()
      throwIfAborted(signal)
      return { kind: 'failure', result: transportFailure(response.statusCode) }
    } finally {
      signal.removeEventListener('abort', abort)
    }
  }

  private redirect(
    response: ResponseDetails,
    currentUrl: string,
    count: number,
    visited: ReadonlySet<string>,
    signal: AbortSignal
  ): HopResult | null {
    if (!REDIRECT_STATUSES.has(response.statusCode)) return null
    throwIfAborted(signal)
    const location = response.headers.location
    if (!location || count >= SUBMISSION_MAX_REDIRECTS) {
      return { kind: 'failure', result: redirectFailure() }
    }
    let destination: URL
    try {
      destination = new URL(location, currentUrl)
    } catch {
      return { kind: 'failure', result: redirectFailure() }
    }
    const redirect = validateSubmissionUrl(destination.href)
    if (!redirect.ok || visited.has(redirect.normalizedUrl)) {
      return { kind: 'failure', result: redirectFailure() }
    }
    return { kind: 'redirect', url: redirect.normalizedUrl }
  }

  private async collectBody(
    body: AsyncIterable<Uint8Array>,
    signal: AbortSignal
  ): Promise<CollectedBody | null> {
    const iterator = body[Symbol.asyncIterator]()
    const chunks: Uint8Array[] = []
    let byteCount = 0
    let complete = false
    try {
      while (true) {
        const next = await this.next(iterator, signal)
        if (next.done) {
          complete = true
          break
        }
        throwIfAborted(signal)
        byteCount += next.value.byteLength
        if (byteCount > this.options.maxBytes) return null
        chunks.push(next.value)
      }
    } finally {
      if (!complete && iterator.return) await iterator.return()
    }
    return { body: chunks.length ? Buffer.concat(chunks).toString('utf8') : undefined, byteCount }
  }

  private async next<Value>(
    iterator: AsyncIterator<Value>,
    signal: AbortSignal
  ): Promise<IteratorResult<Value>> {
    return raceAbort(() => iterator.next(), signal, 'submission-body-aborted')
  }

  private classifyOptionalFailure(result: Result): Result {
    if (result.ok || !this.options.optional || result.failure.kind !== 'oversized_content')
      return result
    return safeFailure(
      'oversized_content',
      'invalid_optional_resource',
      result.failure.safeMessage,
      result.failure.evidence
    )
  }
}

/** Creates an auditable, fail-closed inspector with linked cancellation boundaries. */
export const createNetworkInspector = (overrides: Partial<Dependencies> = {}): NetworkInspector => {
  const dependencies: Dependencies = { ...DEFAULT_DEPENDENCIES, ...overrides }
  return {
    inspect: async (url, options) => {
      try {
        return await dependencies.runWithTimeout(
          signal => new InspectionRunner(dependencies, options).inspect(url, signal),
          SUBMISSION_ASSESSMENT_TIMEOUT_MS
        )
      } catch {
        return timeoutFailure()
      }
    }
  }
}
