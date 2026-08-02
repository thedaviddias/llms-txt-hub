'use client'

import type { PreflightResult } from '@/actions/preflight-submission'
import type { FinalSubmissionResult } from '@/actions/submit-llms-xxt'
import { submissionAnalytics } from '@/lib/submission-analytics'

type SupportPlatform = 'x' | 'linkedin'

const trackDuration = (
  startedAt: number,
  source: 'preflight' | 'final_submission',
  platform?: SupportPlatform
) => {
  submissionAnalytics.assessmentDuration({
    durationBucket: submissionAnalytics.durationBucket(Date.now() - startedAt),
    platform,
    source
  })
}

/**
 * Track aggregate outcome, latency, support view, and Web Risk availability for a preflight.
 */
const trackPreflightResult = (result: PreflightResult, startedAt: number) => {
  submissionAnalytics.preflightOutcome({
    decision: result.status,
    reasonCategory: result.analytics.reasonCategory,
    source: 'preflight'
  })
  trackDuration(startedAt, 'preflight')
  if (result.analytics.webRiskAvailable === true) {
    submissionAnalytics.webRiskAvailable({ source: 'preflight' })
  } else if (result.analytics.webRiskAvailable === false) {
    submissionAnalytics.webRiskUnavailable({ source: 'preflight' })
  }
  if (result.status === 'support_required') {
    submissionAnalytics.supportView({ source: 'support_step' })
  }
}

/** Track a client-side preflight failure without forwarding the thrown value. */
const trackPreflightFailure = (startedAt: number) => {
  submissionAnalytics.preflightOutcome({
    decision: 'retry_later',
    reasonCategory: 'publication',
    source: 'preflight'
  })
  trackDuration(startedAt, 'preflight')
}

/** Track a final submission failure without submitted fields or server error text. */
const trackFinalFailure = (platform: SupportPlatform, startedAt: number) => {
  trackDuration(startedAt, 'final_submission', platform)
  const properties = {
    decision: 'retry_later',
    platform,
    prPresent: false,
    reasonCategory: 'publication',
    source: 'final_submission'
  }
  submissionAnalytics.finalOutcome(properties)
}

const trackFinalResult = (
  result: FinalSubmissionResult,
  platform: SupportPlatform,
  startedAt: number
) => {
  trackDuration(startedAt, 'final_submission', platform)
  submissionAnalytics.finalOutcome({
    decision: result.outcome,
    platform,
    prPresent: result.success,
    reasonCategory: result.analytics.reasonCategory,
    source: 'final_submission'
  })
  if (result.analytics.webRiskAvailable === true) {
    submissionAnalytics.webRiskAvailable({ source: 'final_submission' })
  } else if (result.analytics.webRiskAvailable === false) {
    submissionAnalytics.webRiskUnavailable({ source: 'final_submission' })
  }
  if (result.success) {
    submissionAnalytics.prCreated({
      decision: result.outcome,
      platform,
      prPresent: true,
      source: 'final_submission'
    })
  } else if (result.analytics.publicationAttempted) {
    submissionAnalytics.publishFailure({
      decision: result.outcome,
      platform,
      prPresent: false,
      reasonCategory: 'publication',
      source: 'final_submission'
    })
  }
}

/**
 * Coordinates privacy-safe analytics at trusted-submission lifecycle boundaries.
 */
export function useSubmissionAnalytics() {
  return {
    startPreflight: () => {
      submissionAnalytics.preflightStart({ source: 'submit_page' })
      return Date.now()
    },
    finishPreflight: trackPreflightResult,
    failPreflight: trackPreflightFailure,
    startFinal: () => Date.now(),
    finishFinal: trackFinalResult,
    failFinal: trackFinalFailure,
    trackSubmissionSupportPlatformSelect: (input?: unknown) =>
      submissionAnalytics.supportPlatformSelect(input),
    trackSubmissionProfileOpen: (input?: unknown) => submissionAnalytics.profileOpen(input),
    trackSubmissionFollowAttest: (input?: unknown) => submissionAnalytics.followAttest(input)
  }
}
