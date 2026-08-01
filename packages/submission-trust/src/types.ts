/**
 * Available publication outcomes.
 *
 * Use {@link mergeSubmissionDecisions} to apply the defined precedence; the
 * declaration order does not establish priority.
 */
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
  | 'site_family_uncertain'
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

/** Approved bounded metadata that may be retained as assessment evidence. */
export interface AssessmentEvidenceDetails {
  readonly byteCount?: number
  readonly checkedAt?: string
  readonly contentType?: string
  readonly durationBucket?: 'under_1s' | '1s_to_5s' | 'over_5s'
  readonly evidenceId?: string
  readonly finalHost?: string
  readonly providerStatus?: 'safe' | 'unsafe' | 'unknown'
  readonly redirectHosts?: readonly string[]
  readonly statusCode?: number
  readonly threatTypes?: readonly string[]
}

/** Bounded, structured evidence retained for an individual assessment check. */
export interface AssessmentEvidence {
  readonly check: 'editorial' | 'network' | 'reputation' | 'resource'
  readonly decision: SubmissionDecision
  readonly details?: AssessmentEvidenceDetails
  readonly reasonCode: SubmissionReasonCode
  readonly resource?: 'homepage' | 'llms' | 'llms_full'
}

interface SubmissionAssessmentBase {
  checkedAt: string
  evidence: readonly AssessmentEvidence[]
  policyVersion: string
  publicMessage: string
}

/** Complete decision-discriminated publication assessment returned to trusted callers. */
export type SubmissionAssessment =
  | (SubmissionAssessmentBase & {
      decision: 'auto_publish'
      reasonCode: 'passed'
    })
  | (SubmissionAssessmentBase & {
      decision: 'manual_review'
      reasonCode: 'site_family_uncertain' | 'nonstandard_llms_format' | 'editorial_uncertainty'
    })
  | (SubmissionAssessmentBase & {
      decision: 'reject'
      reasonCode:
        | 'duplicate'
        | 'unsafe_network_target'
        | 'reputation_match'
        | 'required_resource_missing'
        | 'invalid_optional_resource'
        | 'unrelated_site_family'
        | 'prohibited_content'
    })
  | (SubmissionAssessmentBase & {
      decision: 'retry_later'
      reasonCode:
        | 'rate_limited'
        | 'reputation_unknown'
        | 'required_resource_transient_failure'
        | 'publication_unavailable'
    })

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

/** Safe reputation evidence retained for one normalized inspection hop. */
export interface ResourceReputationCheck {
  readonly reputation: Extract<ReputationResult, { status: 'safe' }>
  readonly url: string
}

/** Result of inspecting one submitted resource through the pinned transport. */
export interface InspectedResource {
  readonly body?: string
  readonly byteCount: number
  readonly contentType?: string
  readonly finalUrl: string
  readonly redirectUrls: readonly string[]
  readonly reputation: ReputationResult
  readonly reputationChecks: readonly ResourceReputationCheck[]
  readonly requestedUrl: string
  readonly statusCode: number
}

interface ResourceInspectionFailureBase {
  readonly evidence: AssessmentEvidenceDetails
  readonly safeMessage: string
}

/** Safe, stable inspection failures that callers can classify without raw transport data. */
export type ResourceInspectionFailure =
  | (ResourceInspectionFailureBase & { readonly kind: 'dns_rejected' })
  | (ResourceInspectionFailureBase & { readonly kind: 'reputation_match' })
  | (ResourceInspectionFailureBase & { readonly kind: 'reputation_unknown' })
  | (ResourceInspectionFailureBase & { readonly kind: 'timeout' })
  | (ResourceInspectionFailureBase & { readonly kind: 'redirect_policy_failure' })
  | (ResourceInspectionFailureBase & { readonly kind: 'oversized_content' })
  | (ResourceInspectionFailureBase & { readonly kind: 'transport_failure' })

/** Successful resource inspection or a bounded fail-closed inspection result. */
export type ResourceInspectionResult =
  | {
      readonly ok: true
      readonly resource: InspectedResource
    }
  | {
      readonly failure: ResourceInspectionFailure
      readonly ok: false
      readonly reasonCode:
        | 'unsafe_network_target'
        | 'reputation_match'
        | 'reputation_unknown'
        | 'required_resource_missing'
        | 'required_resource_transient_failure'
        | 'invalid_optional_resource'
    }

/** Dependencies injected into deterministic publication assessment. */
export interface PublicationAssessmentDependencies {
  categories?: readonly {
    description: string
    name: string
    slug: string
  }[]
  inspectResource: (url: string) => Promise<ResourceInspectionResult>
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

/** DNS answer consumed by the pinned network inspector. */
export interface ResolvedAddress {
  readonly address: string
  readonly family: number
}

/** Request passed to transport after URL, DNS, and reputation checks. */
export interface PinnedTransportRequest {
  readonly address: string
  readonly family: 4 | 6
  readonly headers: Readonly<Record<string, string>>
  readonly hostname: string
  readonly servername: string
  readonly signal: AbortSignal
  readonly timeoutMs: number
  readonly url: string
}

/** Bounded response stream returned by a pinned transport. */
export interface PinnedTransportResponse {
  readonly body: AsyncIterable<Uint8Array>
  readonly discard?: () => void
  readonly headers: Readonly<Record<string, string | undefined>>
  readonly statusCode: number
}

/** Deterministic boundaries injected into the inspector. */
export interface NetworkInspectorDependencies {
  readonly checkReputation: (url: string) => Promise<ReputationResult>
  readonly now: () => Date
  readonly resolve: (hostname: string) => Promise<readonly ResolvedAddress[]>
  readonly runWithTimeout: <Value>(
    operation: (signal: AbortSignal) => Promise<Value>,
    timeoutMs: number,
    parentSignal?: AbortSignal
  ) => Promise<Value>
  readonly transport: (request: PinnedTransportRequest) => Promise<PinnedTransportResponse>
}

/** Response limit and optional-resource classification supplied by callers. */
export interface NetworkInspectionOptions {
  readonly maxBytes: number
  readonly optional?: boolean
}

/** Public inspector API. */
export interface NetworkInspector {
  inspect: (url: string, options: NetworkInspectionOptions) => Promise<ResourceInspectionResult>
}
