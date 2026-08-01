import { SUBMISSION_LLMS_MAX_BYTES, SUBMISSION_MAX_REDIRECTS } from '#constants'
import type { AssessmentEvidenceDetails } from '#types'

const CONTENT_TYPE_MAX_LENGTH = 128
const EVIDENCE_ID_MAX_LENGTH = 128
const HOSTNAME_MAX_LENGTH = 253
const THREAT_TYPE_MAX_LENGTH = 64

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value)

const sanitizeString = (value: unknown, maxLength: number): string | undefined => {
  if (typeof value !== 'string') return undefined
  const trimmed = value.trim()
  return trimmed.length > 0 ? trimmed.slice(0, maxLength) : undefined
}

const sanitizeTimestamp = (value: unknown): string | undefined => {
  if (typeof value !== 'string') return undefined
  const timestamp = value.trim()
  if (!timestamp || timestamp.length > 64) return undefined
  const milliseconds = Date.parse(timestamp)
  return Number.isFinite(milliseconds) ? new Date(milliseconds).toISOString() : undefined
}

const sanitizeHostname = (value: unknown): string | undefined => {
  if (typeof value !== 'string') return undefined
  const hostname = value.trim().toLowerCase()
  if (!hostname || hostname.length > HOSTNAME_MAX_LENGTH || !/^[a-z0-9.-]+$/.test(hostname)) {
    return undefined
  }
  const labels = hostname.split('.')
  if (
    labels.some(
      label =>
        label.length === 0 || label.length > 63 || label.startsWith('-') || label.endsWith('-')
    )
  ) {
    return undefined
  }
  return hostname
}

const sanitizeThreatTypes = (value: unknown): readonly string[] | undefined => {
  if (!Array.isArray(value)) return undefined
  const threatTypes = value
    .flatMap(threatType => {
      const sanitized = sanitizeString(threatType, THREAT_TYPE_MAX_LENGTH)
      return sanitized ? [sanitized] : []
    })
    .slice(0, 4)
  return threatTypes.length > 0 ? threatTypes : undefined
}

const sanitizeRedirectHosts = (value: unknown): readonly string[] | undefined => {
  if (!Array.isArray(value)) return undefined
  const redirectHosts = value
    .flatMap(host => {
      const sanitized = sanitizeHostname(host)
      return sanitized ? [sanitized] : []
    })
    .slice(0, SUBMISSION_MAX_REDIRECTS)
  return redirectHosts
}

/**
 * Copies only approved, runtime-valid, bounded assessment evidence fields.
 */
export const sanitizeAssessmentEvidenceDetails = (value: unknown): AssessmentEvidenceDetails => {
  if (!isRecord(value)) return {}
  const byteCount =
    typeof value.byteCount === 'number' && Number.isFinite(value.byteCount) && value.byteCount >= 0
      ? Math.min(Math.floor(value.byteCount), SUBMISSION_LLMS_MAX_BYTES + 1)
      : undefined
  const durationBucket =
    value.durationBucket === 'under_1s' ||
    value.durationBucket === '1s_to_5s' ||
    value.durationBucket === 'over_5s'
      ? value.durationBucket
      : undefined
  const providerStatus =
    value.providerStatus === 'safe' ||
    value.providerStatus === 'unsafe' ||
    value.providerStatus === 'unknown'
      ? value.providerStatus
      : undefined
  const statusCode =
    typeof value.statusCode === 'number' &&
    Number.isInteger(value.statusCode) &&
    value.statusCode >= 100 &&
    value.statusCode <= 599
      ? value.statusCode
      : undefined
  const checkedAt = sanitizeTimestamp(value.checkedAt)
  const contentType = sanitizeString(value.contentType, CONTENT_TYPE_MAX_LENGTH)
  const evidenceId = sanitizeString(value.evidenceId, EVIDENCE_ID_MAX_LENGTH)
  const finalHost = sanitizeHostname(value.finalHost)
  const redirectHosts = sanitizeRedirectHosts(value.redirectHosts)
  const threatTypes = sanitizeThreatTypes(value.threatTypes)
  return {
    ...(byteCount === undefined ? {} : { byteCount }),
    ...(checkedAt ? { checkedAt } : {}),
    ...(contentType ? { contentType } : {}),
    ...(durationBucket ? { durationBucket } : {}),
    ...(evidenceId ? { evidenceId } : {}),
    ...(finalHost ? { finalHost } : {}),
    ...(providerStatus ? { providerStatus } : {}),
    ...(redirectHosts ? { redirectHosts } : {}),
    ...(statusCode === undefined ? {} : { statusCode }),
    ...(threatTypes ? { threatTypes } : {})
  }
}
