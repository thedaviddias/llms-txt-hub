'use client'

import { useRef } from 'react'
import type { PreflightResult } from '@/actions/preflight-submission'
import type { FinalSubmissionResult } from '@/actions/submit-llms-xxt'
import type { SubmissionFieldState } from '@/components/forms/submission-field-analytics'
import { submissionAnalytics } from '@/lib/submission-analytics'

type SupportPlatform = 'x' | 'linkedin'

/**
 * Create a privacy-safe UUID that correlates one submission attempt across funnel events.
 *
 * @returns A UUIDv4 when the browser provides cryptographic randomness.
 */
const createSubmissionAttemptId = () => {
  if (typeof globalThis.crypto?.randomUUID === 'function') return globalThis.crypto.randomUUID()
  if (typeof globalThis.crypto?.getRandomValues !== 'function') return

  const bytes = globalThis.crypto.getRandomValues(new Uint8Array(16))
  bytes[6] = ((bytes[6] ?? 0) & 0x0f) | 0x40
  bytes[8] = ((bytes[8] ?? 0) & 0x3f) | 0x80
  const hex = Array.from(bytes, byte => byte.toString(16).padStart(2, '0')).join('')
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`
}

const trackRequestDuration = (
  startedAt: number,
  source: 'preflight' | 'final_submission',
  platform?: SupportPlatform,
  attemptId?: string
) => {
  submissionAnalytics.requestDuration({
    attemptId,
    durationBucket: submissionAnalytics.durationBucket(Date.now() - startedAt),
    platform,
    source
  })
}

/**
 * Track aggregate outcome, latency, support view, and Web Risk availability for a preflight.
 */
const trackPreflightResult = (result: PreflightResult, startedAt: number, attemptId?: string) => {
  submissionAnalytics.preflightOutcome({
    attemptId,
    decision: result.status,
    reasonCategory: result.analytics.reasonCategory,
    source: 'preflight'
  })
  trackRequestDuration(startedAt, 'preflight', undefined, attemptId)
  if (result.analytics.webRiskAvailable === true) {
    submissionAnalytics.webRiskAvailable({ attemptId, source: 'preflight' })
  } else if (result.analytics.webRiskAvailable === false) {
    submissionAnalytics.webRiskUnavailable({ attemptId, source: 'preflight' })
  }
  if (result.status === 'support_required') {
    submissionAnalytics.supportView({ attemptId, source: 'support_step' })
  }
}

/** Track a client-side preflight failure without forwarding the thrown value. */
const trackPreflightFailure = (startedAt: number, attemptId?: string) => {
  submissionAnalytics.preflightOutcome({
    attemptId,
    decision: 'retry_later',
    reasonCategory: 'unknown',
    source: 'preflight'
  })
  trackRequestDuration(startedAt, 'preflight', undefined, attemptId)
}

/** Track a final submission failure without submitted fields or server error text. */
const trackFinalFailure = (platform: SupportPlatform, startedAt: number, attemptId?: string) => {
  trackRequestDuration(startedAt, 'final_submission', platform, attemptId)
  const properties = {
    attemptId,
    decision: 'retry_later',
    platform,
    prPresent: false,
    reasonCategory: 'unknown',
    source: 'final_submission'
  }
  submissionAnalytics.finalOutcome(properties)
}

const trackFinalResult = (
  result: FinalSubmissionResult,
  platform: SupportPlatform,
  startedAt: number,
  attemptId?: string
) => {
  trackRequestDuration(startedAt, 'final_submission', platform, attemptId)
  submissionAnalytics.finalOutcome({
    attemptId,
    decision: result.outcome,
    platform,
    prPresent: result.analytics.prPresent,
    reasonCategory: result.analytics.reasonCategory,
    source: 'final_submission'
  })
  if (result.analytics.webRiskAvailable === true) {
    submissionAnalytics.webRiskAvailable({ attemptId, source: 'final_submission' })
  } else if (result.analytics.webRiskAvailable === false) {
    submissionAnalytics.webRiskUnavailable({ attemptId, source: 'final_submission' })
  }
  if (result.analytics.prCreated) {
    submissionAnalytics.prCreated({
      attemptId,
      decision: result.outcome,
      platform,
      prPresent: result.analytics.prPresent,
      source: 'final_submission'
    })
  }
  if (!result.success && result.analytics.publicationAttempted) {
    submissionAnalytics.publishFailure({
      attemptId,
      decision: result.outcome,
      platform,
      prPresent: result.analytics.prPresent,
      reasonCategory: 'publication',
      source: 'final_submission'
    })
  }
}

/**
 * Coordinates privacy-safe analytics at trusted-submission lifecycle boundaries.
 */
export function useSubmissionAnalytics() {
  const attemptId = useRef<string | undefined>(undefined)
  /** Return the active attempt ID, creating it when field activity begins the attempt. */
  const ensureAttemptId = () => {
    attemptId.current ??= createSubmissionAttemptId()
    return attemptId.current
  }

  return {
    getAttemptId: () => attemptId.current,
    trackSubmissionPageView: () => submissionAnalytics.pageView({ source: 'submit_page' }),
    startPreflight: () => {
      submissionAnalytics.preflightStart({
        attemptId: ensureAttemptId(),
        source: 'submit_page'
      })
      return Date.now()
    },
    finishPreflight: (result: PreflightResult, startedAt: number) =>
      trackPreflightResult(result, startedAt, attemptId.current),
    failPreflight: (startedAt: number) => trackPreflightFailure(startedAt, attemptId.current),
    startFinal: (platform: SupportPlatform) => {
      submissionAnalytics.finalStart({
        attemptId: attemptId.current,
        platform,
        source: 'final_submission'
      })
      return Date.now()
    },
    finishFinal: (result: FinalSubmissionResult, platform: SupportPlatform, startedAt: number) =>
      trackFinalResult(result, platform, startedAt, attemptId.current),
    failFinal: (platform: SupportPlatform, startedAt: number) =>
      trackFinalFailure(platform, startedAt, attemptId.current),
    trackSubmissionSupportPlatformSelect: (input?: unknown) =>
      submissionAnalytics.supportPlatformSelect(input),
    trackSubmissionProfileOpen: (input?: unknown) => submissionAnalytics.profileOpen(input),
    trackSubmissionFollowAttest: (input?: unknown) => submissionAnalytics.followAttest(input),
    trackSubmissionFieldCompleted: (fieldState: SubmissionFieldState) =>
      submissionAnalytics.fieldCompleted({
        ...fieldState,
        attemptId: ensureAttemptId(),
        source: 'submit_page'
      }),
    trackSubmissionFieldState: (fieldState: SubmissionFieldState) =>
      submissionAnalytics.fieldState({
        ...fieldState,
        attemptId: ensureAttemptId(),
        source: 'submit_page'
      }),
    resetSubmissionAttempt: () => {
      attemptId.current = undefined
    },
    trackSubmissionSupportBack: (input?: unknown) => submissionAnalytics.supportBack(input)
  }
}
