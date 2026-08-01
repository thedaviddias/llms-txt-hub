/** Publication outcomes ordered from least to most restrictive. */
export type SubmissionDecision = 'auto_publish' | 'manual_review' | 'reject' | 'retry_later'

/** Stable machine-readable reasons for a submission assessment. */
export type SubmissionReasonCode =
  | 'passed'
  | 'duplicate'
  | 'rate_limited'
  | 'unsafe_network_target'
  | 'reputation_match'
  | 'reputation_unknown'
  | 'required_resource_missing'
  | 'required_resource_transient_failure'
  | 'invalid_optional_resource'
  | 'unrelated_site_family'
  | 'nonstandard_llms_format'
  | 'editorial_uncertainty'
  | 'prohibited_content'
  | 'publication_unavailable'

/** User-supplied directory fields that publication checks assess. */
export interface SubmissionFields {
  category: string
  description: string
  llmsFullUrl?: string
  llmsUrl: string
  name: string
  publishedAt: string
  website: string
}

/** Bounded, structured evidence retained for an individual assessment check. */
export interface AssessmentEvidence {
  check: 'editorial' | 'network' | 'reputation' | 'resource'
  decision: SubmissionDecision
  details?: Readonly<Record<string, boolean | number | string | readonly string[]>>
  reasonCode: SubmissionReasonCode
  resource?: 'homepage' | 'llms' | 'llms_full'
}

/** Complete fail-closed publication assessment returned to trusted callers. */
export interface SubmissionAssessment {
  checkedAt: string
  decision: SubmissionDecision
  evidence: readonly AssessmentEvidence[]
  policyVersion: string
  publicMessage: string
  reasonCode: SubmissionReasonCode
}

/** Reputation classification for a URL at a specific point in time. */
export type ReputationResult =
  | {
      checkedAt: string
      expiresAt?: string
      status: 'safe'
    }
  | {
      checkedAt: string
      expiresAt?: string
      status: 'unsafe'
      threatTypes: readonly string[]
    }
  | {
      checkedAt: string
      reason: string
      status: 'unknown'
    }

/** Result of inspecting one submitted resource through the pinned transport. */
export interface InspectedResource {
  body?: string
  byteCount: number
  contentType?: string
  finalUrl: string
  redirectUrls: readonly string[]
  reputation: ReputationResult
  requestedUrl: string
  statusCode: number
}

/** Dependencies injected into deterministic publication assessment. */
export interface PublicationAssessmentDependencies {
  categories?: readonly {
    description: string
    name: string
    slug: string
  }[]
  inspectResource: (url: string) => Promise<InspectedResource>
  now?: () => Date
}

/** Exact publication facts bound to an automatic-merge HMAC attestation. */
export interface AssessmentAttestationPayload {
  decision: 'auto_publish'
  expiresAt: string
  headSha: string
  issuedAt: string
  llmsFullUrl?: string
  llmsUrl: string
  mdxContentSha256: string
  mdxPath: string
  policyVersion: string
  prNumber: number
  repository: string
  submissionId: string
  webRiskCheckedAt: string
  website: string
}

const DECISION_PRECEDENCE: Readonly<Record<SubmissionDecision, number>> = {
  auto_publish: 0,
  manual_review: 1,
  reject: 3,
  retry_later: 2
}

/**
 * Merges check outcomes using fail-closed precedence.
 *
 * An empty decision set represents missing evidence and therefore retries later.
 */
export const mergeSubmissionDecisions = (
  decisions: readonly SubmissionDecision[]
): SubmissionDecision => {
  if (decisions.length === 0) {
    return 'retry_later'
  }

  return decisions.reduce((strictest, decision) =>
    DECISION_PRECEDENCE[decision] > DECISION_PRECEDENCE[strictest] ? decision : strictest
  )
}
