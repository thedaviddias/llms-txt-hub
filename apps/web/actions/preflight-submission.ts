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
  acquireSubmissionLocks,
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
  let reasonCode: SubmissionReasonCode = 'publication_unavailable'
  try {
    const session = await auth()
    if (!session?.user?.id) return retryLater('publication_unavailable')
    const storedCsrf = await getStoredCSRFToken()
    if (!isValidSubmissionCsrf(formData.get('_csrf'), storedCsrf?.token)) {
      return rejected(
        'Security validation failed. Refresh the page and try again.',
        'prohibited_content'
      )
    }
    const parsed = parseSubmissionActionInput(formData)
    if (!parsed.ok) return rejected(parsed.message, 'required_resource_missing')
    const sourceIp = submissionSourceIp(await headers())
    if (!sourceIp) return retryLater('publication_unavailable')

    const rateLimit = await enforceSubmissionRateLimits({
      sourceIp,
      userId: session.user.id,
      website: parsed.fields.website
    })
    if (!rateLimit.ok) {
      reasonCode = rateLimit.code
      return rateLimit.code === 'rate_limited'
        ? retryLater('rate_limited')
        : retryLater('publication_unavailable')
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
    if (duplicate.status === 'retry_later') return retryLater(duplicate.reasonCode)
    if (duplicate.status === 'duplicate' || duplicate.status === 'reconcile') {
      return rejected(DUPLICATE_MESSAGE, 'duplicate')
    }

    const assessment = await assessSubmission(parsed.fields)
    reasonCode = assessment.reasonCode
    if (assessment.decision === 'reject') {
      return rejected(assessment.publicMessage, assessment.reasonCode)
    }
    if (assessment.decision === 'retry_later') return retryLater(assessment.reasonCode)

    const continuation = await createSubmissionContinuation({
      fields: parsed.fields,
      submissionId,
      userId: session.user.id
    })
    if (!continuation.ok) return retryLater('publication_unavailable')
    const lock = await acquireSubmissionLocks({
      llmsUrl: parsed.fields.llmsUrl,
      submissionId,
      website: parsed.fields.website
    })
    if (!lock.ok) {
      return lock.code === 'duplicate'
        ? rejected(DUPLICATE_MESSAGE, 'duplicate')
        : retryLater('publication_unavailable')
    }
    return {
      continuationToken: continuation.continuationToken,
      status: 'support_required',
      submissionId
    }
  } catch {
    return retryLater('publication_unavailable')
  } finally {
    logger.info('Submission preflight completed', {
      data: { durationMs: Date.now() - startedAt, reasonCode },
      tags: { operation: 'preflight', type: 'submission' }
    })
  }
}
