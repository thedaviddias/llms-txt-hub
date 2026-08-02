'use server'

import { auth } from '@thedaviddias/auth'
import { logger } from '@thedaviddias/logging'
import { revalidatePath } from 'next/cache'

import { getStoredCSRFToken } from '@/lib/csrf-protection'
import {
  isValidSubmissionCsrf,
  parseFinalSubmissionActionInput
} from '@/lib/submissions/submission-action-input'
import { assessSubmission } from '@/lib/submissions/submission-assessment'
import { checkSubmissionDuplicates } from '@/lib/submissions/submission-duplicates'
import {
  publishSubmission,
  type SubmissionAutopublishMode
} from '@/lib/submissions/submission-publisher'
import { consumeSubmissionContinuation } from '@/lib/submissions/submission-state'

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
  let outcome: FinalSubmissionResult['outcome'] = 'retry_later'
  try {
    const session = await auth()
    if (!session?.user?.id) return rejected('Authentication is required.')
    const storedCsrf = await getStoredCSRFToken()
    if (!isValidSubmissionCsrf(formData.get('_csrf'), storedCsrf?.token)) {
      return rejected('Security validation failed. Refresh the page and try again.')
    }
    const parsed = parseFinalSubmissionActionInput(formData)
    if (!parsed.ok) return rejected(parsed.message)

    const consumed = await consumeSubmissionContinuation({
      continuationToken: parsed.continuationToken,
      fields: parsed.fields,
      userId: session.user.id
    })
    if (!consumed.ok) {
      return consumed.code === 'invalid_continuation' ||
        consumed.code === 'expired' ||
        consumed.code === 'replayed'
        ? rejected('This submission confirmation is invalid or has expired. Start again.')
        : retryLater()
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
    if (duplicate.status === 'retry_later') return retryLater()
    if (duplicate.status === 'duplicate') {
      return rejected('This website or llms.txt URL already has an active directory entry.')
    }

    const assessment = await assessSubmission(parsed.fields)
    if (assessment.decision === 'reject') return rejected(assessment.publicMessage)
    if (assessment.decision === 'retry_later') return retryLater(assessment.publicMessage)

    const publication = await publishSubmission({
      assessment,
      fields: parsed.fields,
      mode: publicationMode(),
      submissionId: consumed.submissionId
    })
    if (!publication.ok) return retryLater()
    outcome = publication.outcome
    try {
      revalidatePath('/')
    } catch {
      logger.warn('Submission published but cache revalidation was unavailable', {
        data: { status: 'unavailable' },
        tags: { operation: 'revalidate', type: 'submission' }
      })
    }
    return {
      outcome: publication.outcome,
      prUrl: publication.prUrl,
      success: true
    }
  } catch {
    return retryLater()
  } finally {
    logger.info('Final submission completed', {
      data: { durationMs: Date.now() - startedAt, outcome },
      tags: { operation: 'final_submission', type: 'submission' }
    })
  }
}
