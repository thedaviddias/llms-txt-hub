import type { SubmissionAssessment } from '@thedaviddias/submission-trust/types'

import type { SubmissionAnalyticsReasonCategory } from '@/lib/analytics'

/** Safe analytics metadata attached to every preflight result. */
export interface SubmissionPreflightAnalytics {
  readonly reasonCategory: SubmissionAnalyticsReasonCategory
  readonly webRiskAvailable?: boolean
}

/** Safe analytics metadata attached to every final submission result. */
export interface SubmissionFinalAnalytics extends SubmissionPreflightAnalytics {
  readonly publicationAttempted: boolean
  readonly prCreated: boolean
  readonly prPresent: boolean
}

/** Convert internal outcome codes into stable non-identifying analytics groups. */
export const submissionReasonCategory = (
  reasonCode: unknown
): SubmissionAnalyticsReasonCategory => {
  if (reasonCode === 'passed') return 'passed'
  if (reasonCode === 'duplicate') return 'duplicate'
  if (reasonCode === 'rate_limited') return 'rate_limit'
  if (reasonCode === 'unsafe_network_target' || reasonCode === 'reputation_match') {
    return 'network_safety'
  }
  if (reasonCode === 'reputation_unknown') return 'reputation_unavailable'
  if (
    reasonCode === 'required_resource_missing' ||
    reasonCode === 'required_resource_transient_failure' ||
    reasonCode === 'invalid_optional_resource' ||
    reasonCode === 'nonstandard_llms_format'
  ) {
    return 'resource'
  }
  if (reasonCode === 'site_family_uncertain' || reasonCode === 'unrelated_site_family') {
    return 'site_ownership'
  }
  if (reasonCode === 'editorial_uncertainty' || reasonCode === 'prohibited_content') {
    return 'editorial'
  }
  if (reasonCode === 'authentication_required') return 'identity'
  if (reasonCode === 'csrf_invalid' || reasonCode === 'source_ip_unavailable') {
    return 'request_security'
  }
  if (
    reasonCode === 'invalid_continuation' ||
    reasonCode === 'expired' ||
    reasonCode === 'replayed'
  ) {
    return 'continuation'
  }
  if (reasonCode === 'invalid_input') return 'input'
  if (
    reasonCode === 'publication_unavailable' ||
    reasonCode === 'in_progress' ||
    reasonCode === 'busy'
  ) {
    return 'publication'
  }
  return 'unknown'
}

/**
 * Derive whether Web Risk completed from all bounded assessment evidence.
 * Unknown evidence takes precedence over safe or matched evidence.
 */
export const assessmentWebRiskAvailable = (
  assessment: SubmissionAssessment
): boolean | undefined => {
  let checked = false
  for (const evidence of assessment.evidence) {
    const providerStatus = evidence.details?.providerStatus
    if (providerStatus === 'unknown' || evidence.reasonCode === 'reputation_unknown') return false
    if (
      providerStatus === 'safe' ||
      providerStatus === 'unsafe' ||
      evidence.reasonCode === 'reputation_match'
    ) {
      checked = true
    }
  }
  return checked ? true : undefined
}

/** Build safe preflight analytics while omitting Web Risk when it was not checked. */
export const preflightAnalyticsMetadata = (
  reasonCode: unknown,
  webRiskAvailable?: boolean
): SubmissionPreflightAnalytics => {
  const reasonCategory = submissionReasonCategory(reasonCode)
  return webRiskAvailable === undefined ? { reasonCategory } : { reasonCategory, webRiskAvailable }
}

/** Build safe final analytics while omitting Web Risk when it was not checked. */
export const finalAnalyticsMetadata = (
  reasonCode: unknown,
  publicationAttempted: boolean,
  prCreated: boolean,
  prPresent: boolean,
  webRiskAvailable?: boolean
): SubmissionFinalAnalytics => {
  const preflight = preflightAnalyticsMetadata(reasonCode, webRiskAvailable)
  return { ...preflight, publicationAttempted, prCreated, prPresent }
}
