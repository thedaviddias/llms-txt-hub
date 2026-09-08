'use server'

import { randomUUID } from 'node:crypto'

import { auth } from '@thedaviddias/auth'
import { logger } from '@thedaviddias/logging'
import type { SubmissionReasonCode } from '@thedaviddias/submission-trust/types'
import { headers } from 'next/headers'

import { getStoredCSRFToken } from '@/lib/csrf-protection'
import {
  isValidSubmissionCsrf,
  parseSubmissionActionInput,
  submissionSourceIp
} from '@/lib/submissions/submission-action-input'
import {
  assessmentWebRiskAvailable,
  preflightAnalyticsMetadata,
  type SubmissionPreflightAnalytics
} from '@/lib/submissions/submission-analytics-metadata'
import { assessSubmission } from '@/lib/submissions/submission-assessment'
import { checkSubmissionDuplicates } from '@/lib/submissions/submission-duplicates'
import {
  createSubmissionContinuation,
  enforceSubmissionRateLimits
} from '@/lib/submissions/submission-state'

const OWNER = 'thedaviddias'
const REPO = 'llms-txt-hub'
const RETRY_MESSAGE =
  'We could not safely verify this site right now. Nothing was published. Please try again later.'
const RATE_LIMIT_MESSAGE =
  'This submission is temporarily rate-limited. Please wait before trying again.'
const DUPLICATE_MESSAGE = 'This website or llms.txt URL already has an active directory entry.'

type PreflightOutcome =
  | {
      readonly continuationToken: string
      readonly status: 'support_required'
      readonly submissionId: string
    }
  | {
      readonly message: string
      readonly reasonCode: SubmissionReasonCode
      readonly status: 'rejected'
    }
  | {
      readonly message: string
      readonly reasonCode: SubmissionReasonCode
      readonly status: 'retry_later'
    }

type PreflightStage =
  | 'assessment'
  | 'auth'
  | 'continuation'
  | 'csrf'
  | 'duplicates'
  | 'input'
  | 'rate_limit'
  | 'source_ip'

/** Client-safe result of the security and editorial preflight. */
export type PreflightResult = PreflightOutcome & {
  readonly analytics: SubmissionPreflightAnalytics
}

const rejected = (message: string, reasonCode: SubmissionReasonCode): PreflightOutcome => ({
  message,
  reasonCode,
  status: 'rejected'
})

const retryLater = (reasonCode: SubmissionReasonCode): PreflightOutcome => ({
  message: reasonCode === 'rate_limited' ? RATE_LIMIT_MESSAGE : RETRY_MESSAGE,
  reasonCode,
  status: 'retry_later'
})

/**
 * Assess a complete submission after its required social entry step.
 *
 * This action never calls GitHub and never returns a continuation for rejected
 * or infrastructure-unknown submissions.
 */
export async function preflightSubmission(formData: FormData): Promise<PreflightResult> {
  const startedAt = Date.now()
  let logOutcome: PreflightResult['status'] = 'retry_later'
  let logReasonCode = 'publication_unavailable'
  let stage: PreflightStage = 'auth'
  let webRiskAvailable: boolean | undefined
  const complete = (result: PreflightOutcome, reasonCode: string): PreflightResult => {
    logOutcome = result.status
    logReasonCode = reasonCode
    if (result.status === 'retry_later') {
      logger.error('Submission preflight retryable failure', {
        data: { reasonCode, stage },
        fingerprint: ['submission-preflight', reasonCode, stage],
        tags: { operation: 'preflight', type: 'submission' }
      })
    }
    return {
      ...result,
      analytics: preflightAnalyticsMetadata(reasonCode, webRiskAvailable)
    }
  }
  try {
    stage = 'auth'
    const session = await auth()
    if (!session?.user?.id) {
      return complete(retryLater('publication_unavailable'), 'authentication_required')
    }
    stage = 'csrf'
    const storedCsrf = await getStoredCSRFToken()
    if (!isValidSubmissionCsrf(formData.get('_csrf'), storedCsrf?.token)) {
      return complete(
        rejected(
          'Security validation failed. Refresh the page and try again.',
          'prohibited_content'
        ),
        'csrf_invalid'
      )
    }
    stage = 'input'
    const parsed = parseSubmissionActionInput(formData)
    if (!parsed.ok) {
      return complete(rejected(parsed.message, 'required_resource_missing'), 'invalid_input')
    }
    stage = 'source_ip'
    const sourceIp = submissionSourceIp(await headers())
    if (!sourceIp) return complete(retryLater('publication_unavailable'), 'source_ip_unavailable')

    stage = 'rate_limit'
    const rateLimit = await enforceSubmissionRateLimits({
      sourceIp,
      userId: session.user.id,
      website: parsed.fields.website
    })
    if (!rateLimit.ok) {
      const result =
        rateLimit.code === 'rate_limited'
          ? retryLater('rate_limited')
          : retryLater('publication_unavailable')
      return complete(result, rateLimit.code)
    }

    const submissionId = `sub_${randomUUID().replace(/-/g, '')}`
    stage = 'duplicates'
    const duplicate = await checkSubmissionDuplicates({
      expectedBaseRef: 'main',
      llmsFullUrl: parsed.fields.llmsFullUrl,
      llmsUrl: parsed.fields.llmsUrl,
      owner: OWNER,
      repo: REPO,
      submissionId,
      website: parsed.fields.website
    })
    if (duplicate.status === 'retry_later') {
      return complete(retryLater(duplicate.reasonCode), duplicate.reasonCode)
    }
    if (duplicate.status === 'duplicate' || duplicate.status === 'reconcile') {
      return complete(rejected(DUPLICATE_MESSAGE, 'duplicate'), 'duplicate')
    }

    stage = 'assessment'
    const assessment = await assessSubmission(parsed.fields)
    webRiskAvailable = assessmentWebRiskAvailable(assessment)
    if (assessment.decision === 'reject') {
      return complete(
        rejected(assessment.publicMessage, assessment.reasonCode),
        assessment.reasonCode
      )
    }
    if (assessment.decision === 'retry_later') {
      return complete(retryLater(assessment.reasonCode), assessment.reasonCode)
    }

    stage = 'continuation'
    const continuation = await createSubmissionContinuation({
      fields: parsed.fields,
      submissionId,
      userId: session.user.id
    })
    if (!continuation.ok) {
      return complete(retryLater('publication_unavailable'), 'publication_unavailable')
    }
    return complete(
      {
        continuationToken: continuation.continuationToken,
        status: 'support_required',
        submissionId
      },
      assessment.reasonCode
    )
  } catch (error) {
    logger.error('Submission preflight failed unexpectedly', {
      data: {
        errorType: error instanceof Error ? error.name : 'UnknownError',
        stage
      },
      tags: { operation: 'preflight', type: 'submission' }
    })
    return complete(retryLater('publication_unavailable'), 'publication_unavailable')
  } finally {
    logger.info('Submission preflight completed', {
      data: {
        durationMs: Date.now() - startedAt,
        outcome: logOutcome,
        reasonCode: logReasonCode,
        stage
      },
      tags: { operation: 'preflight', type: 'submission' }
    })
  }
}
