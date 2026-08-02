import type { EditorialPolicyResult } from '#editorial-policy'
import { sanitizeAssessmentEvidenceDetails } from '#evidence'
import type { AssessmentEvidence } from '#types'

const MANUAL_MESSAGE =
  'Your submission is safe to review, but one or more directory guidelines need a maintainer decision.'
const PASSED_MESSAGE =
  'Your submission passed our checks and will be published automatically after repository validation.'
const PROHIBITED_MESSAGE = 'This submission does not meet the directory content policy.'

type EditorialAssessmentOutcome =
  | {
      readonly decision: 'auto_publish'
      readonly evidence: readonly AssessmentEvidence[]
      readonly publicMessage: string
      readonly reasonCode: 'passed'
    }
  | {
      readonly decision: 'manual_review'
      readonly evidence: readonly AssessmentEvidence[]
      readonly publicMessage: string
      readonly reasonCode: 'editorial_uncertainty'
    }
  | {
      readonly decision: 'reject'
      readonly evidence: readonly AssessmentEvidence[]
      readonly publicMessage: string
      readonly reasonCode: 'prohibited_content'
    }

/** Convert a deterministic editorial result into bounded assessment evidence. */
export const createEditorialOutcome = (
  result: EditorialPolicyResult
): EditorialAssessmentOutcome => {
  switch (result.decision) {
    case 'reject':
      return {
        decision: 'reject',
        evidence: result.evidenceIds.map(evidenceId => ({
          check: 'editorial',
          decision: 'reject',
          details: sanitizeAssessmentEvidenceDetails({ evidenceId }),
          reasonCode: 'prohibited_content'
        })),
        publicMessage: PROHIBITED_MESSAGE,
        reasonCode: 'prohibited_content'
      }
    case 'manual_review':
      return {
        decision: 'manual_review',
        evidence: result.evidenceIds.map(evidenceId => ({
          check: 'editorial',
          decision: 'manual_review',
          details: sanitizeAssessmentEvidenceDetails({ evidenceId }),
          reasonCode: 'editorial_uncertainty'
        })),
        publicMessage: MANUAL_MESSAGE,
        reasonCode: 'editorial_uncertainty'
      }
    case 'auto_publish':
      return {
        decision: 'auto_publish',
        evidence: result.evidenceIds.map(evidenceId => ({
          check: 'editorial',
          decision: 'auto_publish',
          details: sanitizeAssessmentEvidenceDetails({ evidenceId }),
          reasonCode: 'passed'
        })),
        publicMessage: PASSED_MESSAGE,
        reasonCode: 'passed'
      }
  }
}
