import { SUBMISSION_REQUEST_TIMEOUT_MS, WEB_RISK_FRESHNESS_MS } from '#constants'
import type { ReputationResult } from '#types'

const WEB_RISK_LOOKUP_URL = 'https://webrisk.googleapis.com/v1/uris:search'
const UNKNOWN_REASON = 'URL reputation could not be verified.'
const WEB_RISK_BODY_MAX_BYTES = 16_384

/** Web Risk Lookup lists required by the submission trust policy. */
export const WEB_RISK_THREAT_TYPES = [
  'MALWARE',
  'SOCIAL_ENGINEERING',
  'UNWANTED_SOFTWARE',
  'SOCIAL_ENGINEERING_EXTENDED_COVERAGE'
] as const

const SUPPORTED_THREAT_TYPES: ReadonlySet<string> = new Set(WEB_RISK_THREAT_TYPES)

interface WebRiskOptions {
  apiKey?: string
  fetch?: typeof fetch
  now?: () => Date
  timeoutMs?: number
}

interface WebRiskThreat {
  expireTime: string
  threatTypes: readonly string[]
}

const unknown = (checkedAt: string): ReputationResult => ({
  checkedAt,
  reason: UNKNOWN_REASON,
  status: 'unknown'
})

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value)

const parseThreat = (value: unknown, checkedAtMs: number): WebRiskThreat | null => {
  if (!isRecord(value)) return null
  const expireTime = value.expireTime
  const threatTypes = value.threatTypes
  if (
    typeof expireTime !== 'string' ||
    !Array.isArray(threatTypes) ||
    threatTypes.length === 0 ||
    threatTypes.length > WEB_RISK_THREAT_TYPES.length ||
    !threatTypes.every(
      threatType => typeof threatType === 'string' && SUPPORTED_THREAT_TYPES.has(threatType)
    ) ||
    new Set(threatTypes).size !== threatTypes.length
  ) {
    return null
  }
  const expiresAtMs = Date.parse(expireTime)
  if (!Number.isFinite(expiresAtMs) || expiresAtMs <= checkedAtMs) return null
  return { expireTime: new Date(expiresAtMs).toISOString(), threatTypes }
}

const requestUrl = (url: string, apiKey: string): URL => {
  const lookupUrl = new URL(WEB_RISK_LOOKUP_URL)
  lookupUrl.searchParams.append('uri', url)
  for (const threatType of WEB_RISK_THREAT_TYPES) {
    lookupUrl.searchParams.append('threatTypes', threatType)
  }
  lookupUrl.searchParams.append('key', apiKey)
  return lookupUrl
}

const fetchWithDeadline = async (
  transport: typeof fetch,
  url: URL,
  timeoutMs: number
): Promise<unknown> => {
  const controller = new AbortController()
  let reader: ReadableStreamDefaultReader<Uint8Array> | undefined
  let rejectTimeout: ((reason: Error) => void) | undefined
  const deadline = new Promise<never>((_resolve, reject) => {
    rejectTimeout = reject
  })
  const timer = setTimeout(() => {
    controller.abort()
    reader?.cancel().catch(() => undefined)
    rejectTimeout?.(new Error('web-risk-timeout'))
  }, timeoutMs)
  const request = async (): Promise<unknown> => {
    const providerResponse = await transport(url, { method: 'GET', signal: controller.signal })
    if (!providerResponse.ok) {
      await providerResponse.body?.cancel().catch(() => undefined)
      return null
    }
    if (!providerResponse.body) return null
    reader = providerResponse.body.getReader()
    const decoder = new TextDecoder('utf-8', { fatal: true })
    let body = ''
    let byteCount = 0
    while (true) {
      const chunk = await reader.read()
      if (chunk.done) break
      byteCount += chunk.value.byteLength
      if (byteCount > WEB_RISK_BODY_MAX_BYTES) {
        await reader.cancel().catch(() => undefined)
        return null
      }
      body += decoder.decode(chunk.value, { stream: true })
    }
    body += decoder.decode()
    return JSON.parse(body)
  }
  try {
    return await Promise.race([request(), deadline])
  } finally {
    clearTimeout(timer)
  }
}

/**
 * Looks up one normalized public URL through Google Web Risk without exposing
 * provider response data or credentials to callers.
 */
export const checkWebRiskUrl = async (
  url: string,
  options: WebRiskOptions
): Promise<ReputationResult> => {
  const now = options.now ?? (() => new Date())
  const checkedAtDate = now()
  const checkedAt = checkedAtDate.toISOString()
  const checkedAtMs = checkedAtDate.getTime()
  const apiKey = options.apiKey?.trim()
  if (!apiKey) return unknown(checkedAt)

  try {
    const payload = await fetchWithDeadline(
      options.fetch ?? fetch,
      requestUrl(url, apiKey),
      options.timeoutMs ?? SUBMISSION_REQUEST_TIMEOUT_MS
    )
    if (!isRecord(payload)) return unknown(checkedAt)
    if (!Object.hasOwn(payload, 'threat')) {
      if (Object.keys(payload).length !== 0) return unknown(checkedAt)
      return {
        checkedAt,
        expiresAt: new Date(checkedAtMs + WEB_RISK_FRESHNESS_MS).toISOString(),
        status: 'safe'
      }
    }
    const threat = parseThreat(payload.threat, checkedAtMs)
    if (!threat) return unknown(checkedAt)
    return {
      checkedAt,
      expiresAt: threat.expireTime,
      status: 'unsafe',
      threatTypes: threat.threatTypes
    }
  } catch {
    return unknown(checkedAt)
  }
}
