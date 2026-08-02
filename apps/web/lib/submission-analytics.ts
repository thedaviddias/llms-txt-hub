import { submissionReasonCategory } from '@/lib/submissions/submission-analytics-metadata'
import {
  ANALYTICS_EVENTS,
  type SubmissionAnalyticsDecision,
  type SubmissionAnalyticsDurationBucket,
  type SubmissionAnalyticsPlatform,
  type SubmissionAnalyticsReasonCategory,
  type SubmissionAnalyticsSource,
  trackEvent
} from './analytics'

interface SafeSubmissionAnalyticsProperties {
  decision?: SubmissionAnalyticsDecision
  duration_bucket?: SubmissionAnalyticsDurationBucket
  platform?: SubmissionAnalyticsPlatform
  pr_present?: boolean
  reason_category?: SubmissionAnalyticsReasonCategory
  source?: SubmissionAnalyticsSource
}

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value)

const isSubmissionDecision = (value: unknown): value is SubmissionAnalyticsDecision =>
  value === 'support_required' ||
  value === 'automatic' ||
  value === 'manual' ||
  value === 'rejected' ||
  value === 'retry_later'

const isDurationBucket = (value: unknown): value is SubmissionAnalyticsDurationBucket =>
  value === 'under_1s' || value === '1s_to_5s' || value === 'over_5s'

const isPlatform = (value: unknown): value is SubmissionAnalyticsPlatform =>
  value === 'x' || value === 'linkedin'

const isReasonCategory = (value: unknown): value is SubmissionAnalyticsReasonCategory =>
  value === 'passed' ||
  value === 'duplicate' ||
  value === 'rate_limit' ||
  value === 'network_safety' ||
  value === 'reputation_unavailable' ||
  value === 'resource' ||
  value === 'site_ownership' ||
  value === 'editorial' ||
  value === 'publication' ||
  value === 'identity' ||
  value === 'request_security' ||
  value === 'continuation' ||
  value === 'input' ||
  value === 'unknown'

const isSource = (value: unknown): value is SubmissionAnalyticsSource =>
  value === 'submit_page' ||
  value === 'support_step' ||
  value === 'preflight' ||
  value === 'final_submission'

const safeSubmissionProperties = (input: unknown): SafeSubmissionAnalyticsProperties => {
  if (!isRecord(input)) return {}
  const properties: SafeSubmissionAnalyticsProperties = {}
  if (isSubmissionDecision(input.decision)) properties.decision = input.decision
  if (isDurationBucket(input.durationBucket)) properties.duration_bucket = input.durationBucket
  if (isPlatform(input.platform)) properties.platform = input.platform
  if (typeof input.prPresent === 'boolean') properties.pr_present = input.prPresent
  if (isReasonCategory(input.reasonCategory)) properties.reason_category = input.reasonCategory
  if (isSource(input.source)) properties.source = input.source
  return properties
}

const durationBucket = (durationMs: number): SubmissionAnalyticsDurationBucket => {
  if (durationMs < 1000) return 'under_1s'
  if (durationMs <= 5000) return '1s_to_5s'
  return 'over_5s'
}

const trackSubmissionEvent = (
  event: (typeof ANALYTICS_EVENTS)[keyof typeof ANALYTICS_EVENTS],
  input?: unknown
) => {
  trackEvent(event, safeSubmissionProperties(input))
}

/** Privacy-safe helpers for aggregate trusted-submission analytics. */
export const submissionAnalytics = {
  preflightStart: (input?: unknown) =>
    trackSubmissionEvent(ANALYTICS_EVENTS.SUBMISSION_PREFLIGHT_START, input),
  preflightOutcome: (input?: unknown) =>
    trackSubmissionEvent(ANALYTICS_EVENTS.SUBMISSION_PREFLIGHT_OUTCOME, input),
  supportView: (input?: unknown) =>
    trackSubmissionEvent(ANALYTICS_EVENTS.SUBMISSION_SUPPORT_VIEW, input),
  supportPlatformSelect: (input?: unknown) =>
    trackSubmissionEvent(ANALYTICS_EVENTS.SUBMISSION_SUPPORT_PLATFORM_SELECT, input),
  profileOpen: (input?: unknown) =>
    trackSubmissionEvent(ANALYTICS_EVENTS.SUBMISSION_PROFILE_OPEN, input),
  followAttest: (input?: unknown) =>
    trackSubmissionEvent(ANALYTICS_EVENTS.SUBMISSION_FOLLOW_ATTEST, input),
  finalOutcome: (input?: unknown) =>
    trackSubmissionEvent(ANALYTICS_EVENTS.SUBMISSION_FINAL_OUTCOME, input),
  prCreated: (input?: unknown) =>
    trackSubmissionEvent(ANALYTICS_EVENTS.SUBMISSION_PR_CREATED, input),
  publishFailure: (input?: unknown) =>
    trackSubmissionEvent(ANALYTICS_EVENTS.SUBMISSION_PUBLISH_FAILURE, input),
  requestDuration: (input?: unknown) =>
    trackSubmissionEvent(ANALYTICS_EVENTS.SUBMISSION_REQUEST_DURATION, input),
  webRiskAvailable: (input?: unknown) =>
    trackSubmissionEvent(ANALYTICS_EVENTS.SUBMISSION_WEB_RISK_AVAILABLE, input),
  webRiskUnavailable: (input?: unknown) =>
    trackSubmissionEvent(ANALYTICS_EVENTS.SUBMISSION_WEB_RISK_UNAVAILABLE, input),
  durationBucket,
  reasonCategory: submissionReasonCategory
}
