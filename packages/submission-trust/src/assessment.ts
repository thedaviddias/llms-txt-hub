import {
  assessmentEvidenceDetails,
  hasSameSiteFamily,
  isHtmlContentType,
  isTextContentType,
  isTransientHttpStatus,
  isValidSafeReputation
} from '#assessment-resources'
import {
  SUBMISSION_HOMEPAGE_MAX_BYTES,
  SUBMISSION_LLMS_MAX_BYTES,
  SUBMISSION_POLICY_VERSION
} from '#constants'
import { sanitizeAssessmentEvidenceDetails } from '#evidence'
import type {
  AssessmentEvidence,
  AssessmentEvidenceDetails,
  InspectedResource,
  NetworkInspectionOptions,
  PublicationAssessmentDependencies,
  ResourceInspectionResult,
  SubmissionAssessment,
  SubmissionDecision,
  SubmissionFields
} from '#types'

const RETRY_MESSAGE =
  'We could not safely verify this site right now. Nothing was published. Please try again later.'
const OPTIONAL_MESSAGE = 'Fix or remove the optional llms-full.txt URL before submitting again.'
const REQUIRED_MESSAGE = 'A required site resource is missing or invalid.'
const UNSAFE_MESSAGE = 'The submitted resource did not pass the safety checks.'
const FAMILY_MESSAGE = 'The submitted resources do not appear to belong to the same site.'
const MANUAL_MESSAGE =
  'Your submission is safe to review, but one or more directory guidelines need a maintainer decision.'
const PASSED_MESSAGE =
  'Your submission passed our checks and will be published automatically after repository validation.'

type ResourceName = 'homepage' | 'llms' | 'llms_full'
type AssessmentVariant = SubmissionAssessment extends infer Variant
  ? Variant extends SubmissionAssessment
    ? Pick<Variant, 'decision' | 'reasonCode'>
    : never
  : never
type Outcome = AssessmentVariant & {
  evidence: readonly AssessmentEvidence[]
  publicMessage: string
}

interface ResourceTarget {
  name: ResourceName
  options: NetworkInspectionOptions
  url: string
}

const decisionPriority: Readonly<Record<SubmissionDecision, number>> = {
  auto_publish: 0,
  manual_review: 1,
  reject: 3,
  retry_later: 2
}

const reasonPriority: Readonly<Record<SubmissionAssessment['reasonCode'], number>> = {
  duplicate: 70,
  editorial_uncertainty: 10,
  invalid_optional_resource: 50,
  nonstandard_llms_format: 20,
  passed: 0,
  prohibited_content: 80,
  publication_unavailable: 30,
  rate_limited: 40,
  reputation_match: 100,
  reputation_unknown: 90,
  required_resource_missing: 40,
  required_resource_transient_failure: 50,
  site_family_uncertain: 30,
  unrelated_site_family: 60,
  unsafe_network_target: 90
}

const evidence = (
  resource: ResourceName,
  decision: SubmissionDecision,
  reasonCode: SubmissionAssessment['reasonCode'],
  details?: AssessmentEvidenceDetails
): AssessmentEvidence => ({
  check: 'resource',
  decision,
  details: sanitizeAssessmentEvidenceDetails(details),
  reasonCode,
  resource
})

const outcome = (
  variant: AssessmentVariant,
  publicMessage: string,
  resource: ResourceName,
  details?: AssessmentEvidenceDetails
): Outcome => ({
  ...variant,
  evidence: [evidence(resource, variant.decision, variant.reasonCode, details)],
  publicMessage
})

const failureOutcome = (
  resource: ResourceName,
  result: Extract<ResourceInspectionResult, { ok: false }>
): Outcome => {
  const details = result.failure.evidence
  if (result.reasonCode === 'reputation_match') {
    return outcome(
      { decision: 'reject', reasonCode: 'reputation_match' },
      UNSAFE_MESSAGE,
      resource,
      details
    )
  }
  if (result.reasonCode === 'unsafe_network_target') {
    return outcome(
      { decision: 'reject', reasonCode: 'unsafe_network_target' },
      result.failure.safeMessage,
      resource,
      details
    )
  }
  if (result.reasonCode === 'reputation_unknown') {
    return outcome(
      { decision: 'retry_later', reasonCode: 'reputation_unknown' },
      RETRY_MESSAGE,
      resource,
      details
    )
  }
  if (result.reasonCode === 'required_resource_transient_failure') {
    return outcome(
      { decision: 'retry_later', reasonCode: 'required_resource_transient_failure' },
      RETRY_MESSAGE,
      resource,
      details
    )
  }
  if (resource === 'llms_full' || result.reasonCode === 'invalid_optional_resource') {
    return outcome(
      { decision: 'reject', reasonCode: 'invalid_optional_resource' },
      OPTIONAL_MESSAGE,
      resource,
      details
    )
  }
  if (result.reasonCode === 'required_resource_missing') {
    return outcome(
      { decision: 'reject', reasonCode: 'required_resource_missing' },
      REQUIRED_MESSAGE,
      resource,
      details
    )
  }
  return outcome(
    { decision: 'retry_later', reasonCode: 'required_resource_transient_failure' },
    RETRY_MESSAGE,
    resource,
    details
  )
}

const reputationOutcome = (
  name: ResourceName,
  resource: InspectedResource,
  nowMs: number
): Outcome | undefined => {
  const details = assessmentEvidenceDetails(resource)
  if (resource.reputation?.status === 'unsafe') {
    return outcome(
      { decision: 'reject', reasonCode: 'reputation_match' },
      UNSAFE_MESSAGE,
      name,
      details
    )
  }
  if (resource.reputation?.status !== 'safe') {
    return outcome(
      { decision: 'retry_later', reasonCode: 'reputation_unknown' },
      RETRY_MESSAGE,
      name,
      details
    )
  }
  const expectedUrls = [resource.requestedUrl, ...resource.redirectUrls]
  if (
    resource.reputationChecks.length !== expectedUrls.length ||
    !isValidSafeReputation(resource.reputation, nowMs)
  ) {
    return outcome(
      { decision: 'retry_later', reasonCode: 'reputation_unknown' },
      RETRY_MESSAGE,
      name,
      details
    )
  }
  const everyHopSafe = resource.reputationChecks.every(
    (check, index) =>
      check.url === expectedUrls[index] && isValidSafeReputation(check.reputation, nowMs)
  )
  if (!everyHopSafe) {
    return outcome(
      { decision: 'retry_later', reasonCode: 'reputation_unknown' },
      RETRY_MESSAGE,
      name,
      details
    )
  }
  return undefined
}

const statusOutcome = (name: ResourceName, resource: InspectedResource): Outcome | undefined => {
  if (resource.statusCode >= 200 && resource.statusCode < 300) return undefined
  const details = assessmentEvidenceDetails(resource)
  if (isTransientHttpStatus(resource.statusCode)) {
    return outcome(
      { decision: 'retry_later', reasonCode: 'required_resource_transient_failure' },
      RETRY_MESSAGE,
      name,
      details
    )
  }
  if (name === 'llms_full') {
    return outcome(
      { decision: 'reject', reasonCode: 'invalid_optional_resource' },
      OPTIONAL_MESSAGE,
      name,
      details
    )
  }
  return outcome(
    { decision: 'reject', reasonCode: 'required_resource_missing' },
    REQUIRED_MESSAGE,
    name,
    details
  )
}

const familyOutcome = (
  name: ResourceName,
  resource: InspectedResource,
  website: string
): Outcome | undefined => {
  if (
    !hasSameSiteFamily(resource.finalUrl, resource.requestedUrl) &&
    !hasSameSiteFamily(resource.finalUrl, website)
  ) {
    const variant: AssessmentVariant =
      name === 'llms_full'
        ? { decision: 'reject', reasonCode: 'invalid_optional_resource' }
        : { decision: 'reject', reasonCode: 'unrelated_site_family' }
    return outcome(
      variant,
      name === 'llms_full' ? OPTIONAL_MESSAGE : FAMILY_MESSAGE,
      name,
      assessmentEvidenceDetails(resource)
    )
  }
  return undefined
}

const contentOutcome = (name: ResourceName, resource: InspectedResource): Outcome | undefined => {
  const body = typeof resource.body === 'string' ? resource.body.trim() : ''
  const details = assessmentEvidenceDetails(resource)
  if (name === 'homepage') {
    const meaningfulText = body
      .replace(/<[^>]*>/g, ' ')
      .replace(/\s+/g, ' ')
      .trim()
    if (!isHtmlContentType(resource.contentType) || meaningfulText.length < 40) {
      return outcome(
        { decision: 'reject', reasonCode: 'required_resource_missing' },
        REQUIRED_MESSAGE,
        name,
        details
      )
    }
    return undefined
  }
  if (
    !isTextContentType(resource.contentType) ||
    isHtmlContentType(resource.contentType) ||
    !body
  ) {
    const variant: AssessmentVariant =
      name === 'llms_full'
        ? { decision: 'reject', reasonCode: 'invalid_optional_resource' }
        : { decision: 'reject', reasonCode: 'required_resource_missing' }
    return outcome(
      variant,
      name === 'llms_full' ? OPTIONAL_MESSAGE : REQUIRED_MESSAGE,
      name,
      details
    )
  }
  if (name === 'llms_full') return undefined
  const hasHeading = /^#\s+\S/m.test(body)
  const hasAbsoluteLink = /https?:\/\/[^\s)>\]]+/i.test(body)
  if (body.length < 80 || !hasHeading || !hasAbsoluteLink) {
    return outcome(
      { decision: 'manual_review', reasonCode: 'nonstandard_llms_format' },
      MANUAL_MESSAGE,
      name,
      details
    )
  }
  return undefined
}

const evaluateResource = (
  target: ResourceTarget,
  result: ResourceInspectionResult,
  website: string,
  nowMs: number
): readonly Outcome[] => {
  if (!result.ok) return [failureOutcome(target.name, result)]
  const reputation = reputationOutcome(target.name, result.resource, nowMs)
  if (reputation) return [reputation]
  const family = familyOutcome(target.name, result.resource, website)
  if (family) return [family]
  const status = statusOutcome(target.name, result.resource)
  if (status) return [status]
  const outcomes = [contentOutcome(target.name, result.resource)].filter(
    (value): value is Outcome => value !== undefined
  )
  if (outcomes.length > 0) return outcomes
  return [
    outcome(
      { decision: 'auto_publish', reasonCode: 'passed' },
      PASSED_MESSAGE,
      target.name,
      assessmentEvidenceDetails(result.resource)
    )
  ]
}

const inspect = async (
  target: ResourceTarget,
  dependency: PublicationAssessmentDependencies['inspectResource']
): Promise<ResourceInspectionResult> => {
  try {
    return await dependency(target.url, target.options)
  } catch {
    return {
      failure: {
        evidence: {},
        kind: 'transport_failure',
        safeMessage: 'The resource could not be inspected.'
      },
      ok: false,
      reasonCode: 'required_resource_transient_failure'
    }
  }
}

const selectOutcome = (outcomes: readonly Outcome[]): Outcome => {
  let selected = outcomes[0]
  if (!selected) {
    return {
      decision: 'auto_publish',
      evidence: [],
      publicMessage: PASSED_MESSAGE,
      reasonCode: 'passed'
    }
  }
  for (const candidate of outcomes.slice(1)) {
    const candidateDecision = decisionPriority[candidate.decision]
    const selectedDecision = decisionPriority[selected.decision]
    if (
      candidateDecision > selectedDecision ||
      (candidateDecision === selectedDecision &&
        reasonPriority[candidate.reasonCode] > reasonPriority[selected.reasonCode])
    ) {
      selected = candidate
    }
  }
  return selected
}

/**
 * Assesses normalized publication resources using only the shared hardened
 * inspector and returns a fail-closed, decision-discriminated result.
 */
export const assessPublicationFields = async (
  fields: SubmissionFields,
  dependencies: PublicationAssessmentDependencies
): Promise<SubmissionAssessment> => {
  const now = dependencies.now?.() ?? new Date()
  const targets: ResourceTarget[] = [
    { name: 'homepage', options: { maxBytes: SUBMISSION_HOMEPAGE_MAX_BYTES }, url: fields.website },
    { name: 'llms', options: { maxBytes: SUBMISSION_LLMS_MAX_BYTES }, url: fields.llmsUrl }
  ]
  if (fields.llmsFullUrl) {
    targets.push({
      name: 'llms_full',
      options: { maxBytes: SUBMISSION_LLMS_MAX_BYTES, optional: true },
      url: fields.llmsFullUrl
    })
  }
  const results = await Promise.all(
    targets.map(target => inspect(target, dependencies.inspectResource))
  )
  const outcomes = targets.flatMap((target, index) => {
    const result = results[index]
    return result ? evaluateResource(target, result, fields.website, now.getTime()) : []
  })

  if (!hasSameSiteFamily(fields.website, fields.llmsUrl)) {
    outcomes.push(
      outcome(
        { decision: 'manual_review', reasonCode: 'site_family_uncertain' },
        MANUAL_MESSAGE,
        'llms'
      )
    )
  }
  if (fields.llmsFullUrl && !hasSameSiteFamily(fields.website, fields.llmsFullUrl)) {
    outcomes.push(
      outcome(
        { decision: 'reject', reasonCode: 'invalid_optional_resource' },
        OPTIONAL_MESSAGE,
        'llms_full'
      )
    )
  }

  const selected = selectOutcome(outcomes)
  return {
    ...selected,
    checkedAt: now.toISOString(),
    evidence: outcomes.flatMap(value => value.evidence),
    policyVersion: SUBMISSION_POLICY_VERSION
  }
}
