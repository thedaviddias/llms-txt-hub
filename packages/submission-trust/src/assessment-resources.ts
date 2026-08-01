import { getDomain } from 'tldts'

import { WEB_RISK_FRESHNESS_MS } from '#constants'
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
  return getDomain(host) ?? host
}

/** Builds sanitized, bounded metadata for one inspected resource. */
export const assessmentEvidenceDetails = (
  resource: InspectedResource
): AssessmentEvidenceDetails => {
  const rawCheckedAt = resource.reputationChecks[0]?.reputation.checkedAt
  const checkedAt =
    typeof rawCheckedAt === 'string' && rawCheckedAt.length > 0
      ? rawCheckedAt.slice(0, 160)
      : undefined
  const providerStatus =
    resource.reputation?.status === 'safe' ||
    resource.reputation?.status === 'unsafe' ||
    resource.reputation?.status === 'unknown'
      ? resource.reputation.status
      : 'unknown'
  const threatTypes =
    resource.reputation?.status === 'unsafe' && Array.isArray(resource.reputation.threatTypes)
      ? resource.reputation.threatTypes
          .slice(0, 8)
          .flatMap(value =>
            typeof value === 'string' && value.length > 0 ? [value.slice(0, 80)] : []
          )
      : undefined
  return {
    byteCount:
      Number.isFinite(resource.byteCount) && resource.byteCount >= 0
        ? Math.floor(resource.byteCount)
        : undefined,
    checkedAt,
    contentType:
      typeof resource.contentType === 'string' && resource.contentType.length > 0
        ? resource.contentType.slice(0, 160)
        : undefined,
    finalHost: hostname(resource.finalUrl),
    providerStatus,
    redirectHosts: resource.redirectUrls.slice(0, 4).flatMap(url => {
      const host = hostname(url)
      return host ? [host] : []
    }),
    statusCode: Number.isInteger(resource.statusCode) ? resource.statusCode : undefined,
    threatTypes
  }
}

/** Reports whether two resource URLs share one registrable site family. */
export const hasSameSiteFamily = (left: string, right: string): boolean => {
  const leftFamily = siteFamily(left)
  const rightFamily = siteFamily(right)
  return Boolean(leftFamily && rightFamily && leftFamily === rightFamily)
}

/** Reports whether a response content type is HTML. */
export const isHtmlContentType = (contentType: string | undefined): boolean =>
  contentType?.split(';')[0]?.trim().toLowerCase() === 'text/html'

/** Reports whether a status code represents a successful HTTP response. */
export const isSuccessfulHttpStatus = (statusCode: number): boolean =>
  statusCode >= 200 && statusCode < 300

/** Reports whether a response content type is suitable for an llms text resource. */
export const isTextContentType = (contentType: string | undefined): boolean => {
  const mediaType = contentType?.split(';')[0]?.trim().toLowerCase()
  return Boolean(
    mediaType?.startsWith('text/') ||
      mediaType === 'application/markdown' ||
      mediaType === 'text/markdown'
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
