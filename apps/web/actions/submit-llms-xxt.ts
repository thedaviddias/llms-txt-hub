'use server'

import { auth } from '@thedaviddias/auth'
import { logger } from '@thedaviddias/logging'
import type { SubmissionReasonCode } from '@thedaviddias/submission-trust/types'
import { revalidatePath } from 'next/cache'

import { getStoredCSRFToken } from '@/lib/csrf-protection'
import {
  isValidSubmissionCsrf,
  parseFinalSubmissionActionInput
} from '@/lib/submissions/submission-action-input'
import { assessSubmission } from '@/lib/submissions/submission-assessment'
import { checkSubmissionDuplicates } from '@/lib/submissions/submission-duplicates'
import { recordFinalSubmissionOutcome } from '@/lib/submissions/submission-publication-state'
import {
  publishSubmission,
  type SubmissionAutopublishMode
} from '@/lib/submissions/submission-publisher'
import {
  acquireSubmissionLocks,
  consumeSubmissionContinuation
} from '@/lib/submissions/submission-state'

const OWNER = 'thedaviddias'
const REPO = 'llms-txt-hub'
const RETRY_MESSAGE =
  'We could not safely complete this submission right now. Nothing was published. Please try again later.'

/** Client-safe final submission result. */
export type FinalSubmissionResult =
  | {
      readonly error?: undefined
      readonly outcome: 'automatic' | 'manual'
      readonly prUrl: string
      readonly success: true
    }
  | {
      readonly error: string
      readonly outcome: 'rejected' | 'retry_later'
      readonly prUrl?: undefined
      readonly success: false
    }

const retryLater = (error = RETRY_MESSAGE): FinalSubmissionResult => ({
  error,
  outcome: 'retry_later',
  success: false
})

const rejected = (error: string): FinalSubmissionResult => ({
  error,
  outcome: 'rejected',
  success: false
})

const publicationMode = (): SubmissionAutopublishMode => {
  const value = process.env.SUBMISSION_AUTOPUBLISH_MODE
  return value === 'enabled' || value === 'shadow' ? value : 'disabled'
}

/**
 * Consume a support continuation, repeat every publication check, and
 * coordinate idempotent GitHub publication.
 */
export async function submitLlmsTxt(formData: FormData): Promise<FinalSubmissionResult> {
  const startedAt = Date.now()
  let logOutcome: FinalSubmissionResult['outcome'] = 'retry_later'
  let logReasonCode = 'publication_unavailable'
  let activeSubmission: { readonly fields: unknown; readonly submissionId: string } | undefined
  const complete = (result: FinalSubmissionResult, reasonCode: string): FinalSubmissionResult => {
    logOutcome = result.outcome
    logReasonCode = reasonCode
    return result
  }
  const finalize = async (
    outcome: 'rejected' | 'retry_later',
    reasonCode: SubmissionReasonCode
  ): Promise<boolean> => {
    if (!activeSubmission) return false
    try {
      const updated = await recordFinalSubmissionOutcome({
        fields: activeSubmission.fields,
        outcome,
        reasonCode,
        submissionId: activeSubmission.submissionId
      })
      if (updated) return true
    } catch {
      // The stable log below is deliberately free of submitted fields and tokens.
    }
    logger.error('Final submission state transition unavailable', {
      data: { reasonCode: 'publication_unavailable' },
      tags: { operation: 'final_submission_state', type: 'submission' }
    })
    return false
  }
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return complete(rejected('Authentication is required.'), 'authentication_required')
    }
    const storedCsrf = await getStoredCSRFToken()
    if (!isValidSubmissionCsrf(formData.get('_csrf'), storedCsrf?.token)) {
      return complete(
        rejected('Security validation failed. Refresh the page and try again.'),
        'csrf_invalid'
      )
    }
    const parsed = parseFinalSubmissionActionInput(formData)
    if (!parsed.ok) return complete(rejected(parsed.message), 'invalid_input')

    const consumed = await consumeSubmissionContinuation({
      continuationToken: parsed.continuationToken,
      fields: parsed.fields,
      userId: session.user.id
    })
    if (!consumed.ok) {
      const result =
        consumed.code === 'invalid_continuation' ||
        consumed.code === 'expired' ||
        consumed.code === 'replayed'
          ? rejected('This submission confirmation is invalid or has expired. Start again.')
          : retryLater()
      return complete(result, consumed.code)
    }
    activeSubmission = { fields: parsed.fields, submissionId: consumed.submissionId }

    const lock = await acquireSubmissionLocks({
      llmsUrl: parsed.fields.llmsUrl,
      submissionId: consumed.submissionId,
      website: parsed.fields.website
    })
    if (!lock.ok) {
      const outcome = lock.code === 'duplicate' ? 'rejected' : 'retry_later'
      const reasonCode = lock.code === 'duplicate' ? 'duplicate' : 'publication_unavailable'
      const updated = await finalize(outcome, reasonCode)
      return complete(
        updated && outcome === 'rejected'
          ? rejected('This website or llms.txt URL already has an active directory entry.')
          : retryLater(),
        updated ? reasonCode : 'publication_unavailable'
      )
    }

    const duplicate = await checkSubmissionDuplicates({
      expectedBaseRef: 'main',
      llmsFullUrl: parsed.fields.llmsFullUrl,
      llmsUrl: parsed.fields.llmsUrl,
      owner: OWNER,
      repo: REPO,
      submissionId: consumed.submissionId,
      website: parsed.fields.website
    })
    if (duplicate.status === 'retry_later') {
      const updated = await finalize('retry_later', duplicate.reasonCode)
      return complete(retryLater(), updated ? duplicate.reasonCode : 'publication_unavailable')
    }
    if (duplicate.status === 'duplicate') {
      const updated = await finalize('rejected', 'duplicate')
      return complete(
        updated
          ? rejected('This website or llms.txt URL already has an active directory entry.')
          : retryLater(),
        updated ? 'duplicate' : 'publication_unavailable'
      )
    }

    const assessment = await assessSubmission(parsed.fields)
    if (assessment.decision === 'reject') {
      const updated = await finalize('rejected', assessment.reasonCode)
      return complete(
        updated ? rejected(assessment.publicMessage) : retryLater(),
        updated ? assessment.reasonCode : 'publication_unavailable'
      )
    }
    if (assessment.decision === 'retry_later') {
      const updated = await finalize('retry_later', assessment.reasonCode)
      return complete(
        retryLater(updated ? assessment.publicMessage : undefined),
        updated ? assessment.reasonCode : 'publication_unavailable'
      )
    }

    const publication = await publishSubmission({
      assessment,
      fields: parsed.fields,
      mode: publicationMode(),
      submissionId: consumed.submissionId
    })
    if (!publication.ok) {
      if (publication.recovery === 'fresh_preflight') {
        await finalize('retry_later', 'publication_unavailable')
      }
      return complete(retryLater(), 'publication_unavailable')
    }
    try {
      revalidatePath('/')
    } catch {
      logger.warn('Submission published but cache revalidation was unavailable', {
        data: { status: 'unavailable' },
        tags: { operation: 'revalidate', type: 'submission' }
      })
    }
    return complete(
      {
        outcome: publication.outcome,
        prUrl: publication.prUrl,
        success: true
      },
      assessment.reasonCode
    )
  } catch {
    if (activeSubmission) await finalize('retry_later', 'publication_unavailable')
    return complete(retryLater(), 'publication_unavailable')
  } finally {
    logger.info('Final submission completed', {
      data: {
        durationMs: Date.now() - startedAt,
        outcome: logOutcome,
        reasonCode: logReasonCode
      },
      tags: { operation: 'final_submission', type: 'submission' }
    })
  }
}
