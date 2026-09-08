import { logger } from '@thedaviddias/logging'
import type { SubmissionDuplicateResult } from './submission-duplicates'

/**
 * Preserve uncertainty in pending PR inspection and require manual publication.
 * @param inspect - Bounded pending-PR inspection operation
 * @returns An inspected result or an explicit manual-review requirement
 */
export async function inspectPendingDuplicates(
  inspect: () => Promise<SubmissionDuplicateResult>
): Promise<SubmissionDuplicateResult> {
  try {
    const result = await inspect()
    if (result.status !== 'retry_later') return result
  } catch {
    // Failed external inspection cannot authorize automatic publication.
  }
  logger.warn('Pending submission duplicate inspection requires manual review', {
    data: { reason: 'open_pr_inspection_incomplete' },
    tags: { operation: 'duplicate_check', type: 'submission' }
  })
  return { status: 'review_required' }
}
