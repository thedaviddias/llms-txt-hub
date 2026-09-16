import { logger } from '@thedaviddias/logging'
import { assessPublicationFields } from '@thedaviddias/submission-trust/assessment'
import { createNetworkInspector } from '@thedaviddias/submission-trust/network-inspector'
import type { SubmissionAssessment, SubmissionFields } from '@thedaviddias/submission-trust/types'
import { checkWebRiskUrl } from '@thedaviddias/submission-trust/web-risk'

import { categories } from '@/lib/categories'

/**
 * Run the complete hardened server-side publication assessment.
 *
 * @param fields - Canonical submission fields
 * @returns Fresh fail-closed technical and editorial assessment
 */
export async function assessSubmission(fields: SubmissionFields): Promise<SubmissionAssessment> {
  const inspector = createNetworkInspector({
    checkReputation: url => checkWebRiskUrl(url, { apiKey: process.env.GOOGLE_WEB_RISK_API_KEY })
  })
  const assessment = await assessPublicationFields(fields, {
    categories,
    inspectResource: (url, options) => inspector.inspect(url, options)
  })
  if (assessment.decision === 'reject' || assessment.decision === 'retry_later') {
    logger.warn('Submission resource assessment failed', {
      data: {
        decision: assessment.decision,
        reasonCode: assessment.reasonCode,
        resources: assessment.evidence.slice(0, 12).map(entry => ({
          resource: entry.resource,
          reasonCode: entry.reasonCode,
          decision: entry.decision,
          statusCode: entry.details?.statusCode,
          contentType: entry.details?.contentType,
          byteCount: entry.details?.byteCount,
          evidenceId: entry.details?.evidenceId
        }))
      },
      tags: { type: 'submission', operation: 'assessment' }
    })
  }
  return assessment
}
