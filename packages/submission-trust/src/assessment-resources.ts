import { getDomain } from 'tldts'

import { SUBMISSION_MAX_REDIRECTS, WEB_RISK_FRESHNESS_MS } from '#constants'
import { sanitizeAssessmentEvidenceDetails } from '#evidence'
import type { AssessmentEvidenceDetails, InspectedResource, ReputationResult } from '#types'

const hostname = (url: string): string | undefined => {
  try {
    return new URL(url).hostname.toLowerCase()
  } catch {
    return undefined
  }
}

const siteFamily = (url: string): string | undefined => {
  const host = hostname(url)
  if (!host) return undefined
  return getDomain(host, { allowPrivateDomains: true, extractHostname: false }) ?? host
}

/** Builds sanitized, bounded metadata for one inspected resource. */
export const assessmentEvidenceDetails = (resource: InspectedResource): AssessmentEvidenceDetails =>
  sanitizeAssessmentEvidenceDetails({
    byteCount: resource.byteCount,
    checkedAt: resource.reputationChecks[0]?.reputation.checkedAt,
    contentType: resource.contentType,
    finalHost: hostname(resource.finalUrl),
    providerStatus: resource.reputation?.status,
    redirectHosts: resource.redirectUrls.slice(0, SUBMISSION_MAX_REDIRECTS).flatMap(url => {
      const host = hostname(url)
      return host ? [host] : []
    }),
    statusCode: resource.statusCode,
    threatTypes:
      resource.reputation?.status === 'unsafe' ? resource.reputation.threatTypes : undefined
  })

/** Reports whether two resource URLs share one registrable site family. */
export const hasSameSiteFamily = (left: string, right: string): boolean => {
  const leftFamily = siteFamily(left)
  const rightFamily = siteFamily(right)
  return Boolean(leftFamily && rightFamily && leftFamily === rightFamily)
}

/** Reports whether a response content type is HTML. */
export const isHtmlContentType = (contentType: string | undefined): boolean =>
  !contentType?.includes(',') && contentType?.split(';')[0]?.trim().toLowerCase() === 'text/html'

/** Reports whether a response content type is suitable for an llms text resource. */
export const isTextContentType = (contentType: string | undefined): boolean => {
  if (contentType?.includes(',')) return false
  const mediaType = contentType?.split(';')[0]?.trim().toLowerCase()
  return (
    mediaType === 'text/plain' ||
    mediaType === 'text/markdown' ||
    mediaType === 'application/markdown'
  )
}

/** Reports whether a status code represents a retryable HTTP response. */
export const isTransientHttpStatus = (statusCode: number): boolean =>
  statusCode === 408 || statusCode === 429 || statusCode >= 500

/** Validates fresh, runtime-safe reputation evidence for one URL hop. */
export const isValidSafeReputation = (value: ReputationResult, nowMs: number): boolean => {
  if (
    !Number.isFinite(nowMs) ||
    !value ||
    value.status !== 'safe' ||
    typeof value.checkedAt !== 'string'
  ) {
    return false
  }
  const checkedAtMs = Date.parse(value.checkedAt)
  if (
    !Number.isFinite(checkedAtMs) ||
    checkedAtMs > nowMs ||
    nowMs - checkedAtMs > WEB_RISK_FRESHNESS_MS
  ) {
    return false
  }
  if (value.expiresAt === undefined) return true
  const expiresAtMs = Date.parse(value.expiresAt)
  return Number.isFinite(expiresAtMs) && expiresAtMs > nowMs
}
