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
const DUPLICATE_MESSAGE = 'This website or llms.txt URL already has an active directory entry.'

/** Client-safe result of the security and editorial preflight. */
export type PreflightResult =
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

const rejected = (message: string, reasonCode: SubmissionReasonCode): PreflightResult => ({
  message,
  reasonCode,
  status: 'rejected'
})

const retryLater = (reasonCode: SubmissionReasonCode): PreflightResult => ({
  message: RETRY_MESSAGE,
  reasonCode,
  status: 'retry_later'
})

/**
 * Assess a complete Step 2 submission before exposing the social support step.
 *
 * This action never calls GitHub and never returns a continuation for rejected
 * or infrastructure-unknown submissions.
 */
export async function preflightSubmission(formData: FormData): Promise<PreflightResult> {
  const startedAt = Date.now()
  let logOutcome: PreflightResult['status'] = 'retry_later'
  let logReasonCode = 'publication_unavailable'
  const complete = (
    result: PreflightResult,
    reasonCode: string = result.status
  ): PreflightResult => {
    logOutcome = result.status
    logReasonCode = reasonCode
    return result
  }
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return complete(retryLater('publication_unavailable'), 'authentication_required')
    }
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
    const parsed = parseSubmissionActionInput(formData)
    if (!parsed.ok) {
      return complete(rejected(parsed.message, 'required_resource_missing'), 'invalid_input')
    }
    const sourceIp = submissionSourceIp(await headers())
    if (!sourceIp) return complete(retryLater('publication_unavailable'), 'source_ip_unavailable')

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

    const assessment = await assessSubmission(parsed.fields)
    if (assessment.decision === 'reject') {
      return complete(
        rejected(assessment.publicMessage, assessment.reasonCode),
        assessment.reasonCode
      )
    }
    if (assessment.decision === 'retry_later') {
      return complete(retryLater(assessment.reasonCode), assessment.reasonCode)
    }

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
  } catch {
    return complete(retryLater('publication_unavailable'), 'publication_unavailable')
  } finally {
    logger.info('Submission preflight completed', {
      data: {
        durationMs: Date.now() - startedAt,
        outcome: logOutcome,
        reasonCode: logReasonCode
      },
      tags: { operation: 'preflight', type: 'submission' }
    })
  }
}
