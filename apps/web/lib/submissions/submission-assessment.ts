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
  return assessPublicationFields(fields, {
    categories,
    inspectResource: (url, options) => inspector.inspect(url, options)
  })
}
