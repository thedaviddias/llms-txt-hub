import { describe, expect, it } from 'vitest'

import type {
  AssessmentEvidence,
  InspectedResource,
  ResourceInspectionResult,
  SubmissionAssessment
} from './types.js'
import { mergeSubmissionDecisions } from './types.js'

const ASSESSMENT_BASE = {
  checkedAt: '2026-08-01T12:00:00.000Z',
  evidence: [],
  policyVersion: '2026-08-01.v1',
  publicMessage: 'Assessment complete.'
} as const

const INSPECTED_RESOURCE = {
  body: '# Example\n\nhttps://example.com/docs',
  byteCount: 36,
  contentType: 'text/plain',
  finalUrl: 'https://example.com/llms.txt',
  redirectUrls: [],
  reputation: {
    checkedAt: '2026-08-01T12:00:00.000Z',
    status: 'safe'
  },
  reputationChecks: [
    {
      reputation: {
        checkedAt: '2026-08-01T12:00:00.000Z',
        status: 'safe'
      },
      url: 'https://example.com/llms.txt'
    }
  ],
  requestedUrl: 'https://example.com/llms.txt',
  statusCode: 200
} satisfies InspectedResource

const acceptAssessment = (_assessment: SubmissionAssessment): void => {}
const acceptEvidence = (_evidence: AssessmentEvidence): void => {}

acceptAssessment({ ...ASSESSMENT_BASE, decision: 'auto_publish', reasonCode: 'passed' })
acceptAssessment({
  ...ASSESSMENT_BASE,
  decision: 'manual_review',
  reasonCode: 'editorial_uncertainty'
})
acceptAssessment({
  ...ASSESSMENT_BASE,
  decision: 'manual_review',
  reasonCode: 'site_family_uncertain'
})
acceptAssessment({ ...ASSESSMENT_BASE, decision: 'reject', reasonCode: 'prohibited_content' })
acceptAssessment({ ...ASSESSMENT_BASE, decision: 'reject', reasonCode: 'unrelated_site_family' })
acceptAssessment({
  ...ASSESSMENT_BASE,
  decision: 'retry_later',
  reasonCode: 'publication_unavailable'
})

// @ts-expect-error automatic publication requires the passed reason
acceptAssessment({
  ...ASSESSMENT_BASE,
  decision: 'auto_publish',
  reasonCode: 'editorial_uncertainty'
})
// @ts-expect-error manual review cannot use an automatic-publication reason
acceptAssessment({ ...ASSESSMENT_BASE, decision: 'manual_review', reasonCode: 'passed' })
// @ts-expect-error rejection cannot represent an unknown reputation result
acceptAssessment({ ...ASSESSMENT_BASE, decision: 'reject', reasonCode: 'reputation_unknown' })
// @ts-expect-error retry later cannot represent established prohibited content
acceptAssessment({ ...ASSESSMENT_BASE, decision: 'retry_later', reasonCode: 'prohibited_content' })
// @ts-expect-error an established unrelated site family must be rejected
acceptAssessment({
  ...ASSESSMENT_BASE,
  decision: 'manual_review',
  reasonCode: 'unrelated_site_family'
})
// @ts-expect-error an uncertain site family must receive manual review
acceptAssessment({ ...ASSESSMENT_BASE, decision: 'reject', reasonCode: 'site_family_uncertain' })

acceptEvidence({
  check: 'resource',
  decision: 'reject',
  // @ts-expect-error evidence details reject arbitrary or sensitive metadata keys
  details: { rawBody: 'secret response body' },
  reasonCode: 'required_resource_missing'
})

const RESOURCE_RESULTS = [
  {
    ok: true,
    resource: INSPECTED_RESOURCE
  },
  {
    failure: {
      evidence: {
        evidenceId: 'dns-public-address-required',
        finalHost: 'example.com'
      },
      kind: 'dns_rejected',
      safeMessage: 'The resource host could not be safely inspected.'
    },
    ok: false,
    reasonCode: 'unsafe_network_target'
  },
  {
    failure: {
      evidence: { providerStatus: 'unsafe', threatTypes: ['MALWARE'] },
      kind: 'reputation_match',
      safeMessage: 'The resource was reported as unsafe.'
    },
    ok: false,
    reasonCode: 'reputation_match'
  },
  {
    failure: {
      evidence: { providerStatus: 'unknown' },
      kind: 'reputation_unknown',
      safeMessage: 'The resource reputation could not be verified.'
    },
    ok: false,
    reasonCode: 'reputation_unknown'
  },
  {
    failure: {
      evidence: { durationBucket: 'over_5s' },
      kind: 'timeout',
      safeMessage: 'The resource inspection timed out.'
    },
    ok: false,
    reasonCode: 'required_resource_transient_failure'
  },
  {
    failure: {
      evidence: { evidenceId: 'redirect-policy-rejected' },
      kind: 'redirect_policy_failure',
      safeMessage: 'The resource redirect could not be followed safely.'
    },
    ok: false,
    reasonCode: 'unsafe_network_target'
  },
  {
    failure: {
      evidence: { byteCount: 1_048_577 },
      kind: 'oversized_content',
      safeMessage: 'The resource response was too large.'
    },
    ok: false,
    reasonCode: 'invalid_optional_resource'
  },
  {
    failure: {
      evidence: { statusCode: 503 },
      kind: 'transport_failure',
      safeMessage: 'The resource could not be inspected.'
    },
    ok: false,
    reasonCode: 'required_resource_transient_failure'
  }
] satisfies readonly ResourceInspectionResult[]

describe('mergeSubmissionDecisions', () => {
  it.each([
    [['auto_publish', 'manual_review'], 'manual_review'],
    [['manual_review', 'auto_publish'], 'manual_review'],
    [['auto_publish', 'retry_later'], 'retry_later'],
    [['retry_later', 'auto_publish'], 'retry_later'],
    [['auto_publish', 'reject'], 'reject'],
    [['reject', 'auto_publish'], 'reject'],
    [['manual_review', 'retry_later'], 'retry_later'],
    [['retry_later', 'manual_review'], 'retry_later'],
    [['manual_review', 'reject'], 'reject'],
    [['reject', 'manual_review'], 'reject'],
    [['retry_later', 'reject'], 'reject'],
    [['reject', 'retry_later'], 'reject']
  ] as const)('merges %j as %s', (decisions, expected) => {
    expect(mergeSubmissionDecisions(decisions)).toBe(expected)
  })

  it.each(['auto_publish', 'manual_review', 'retry_later', 'reject'] as const)(
    'keeps singleton decision %s',
    decision => {
      expect(mergeSubmissionDecisions([decision])).toBe(decision)
    }
  )

  it.each(['auto_publish', 'manual_review', 'retry_later', 'reject'] as const)(
    'merges duplicate decision %s',
    decision => {
      expect(mergeSubmissionDecisions([decision, decision, decision])).toBe(decision)
    }
  )

  it.each([
    ['beginning', ['reject', 'auto_publish', 'manual_review']],
    ['middle', ['auto_publish', 'reject', 'retry_later']],
    ['end', ['manual_review', 'retry_later', 'reject']]
  ] as const)('finds the strictest decision at the %s', (_position, decisions) => {
    expect(mergeSubmissionDecisions(decisions)).toBe('reject')
  })

  it('fails closed when no decisions are available', () => {
    expect(mergeSubmissionDecisions([])).toBe('retry_later')
  })
})

describe('resource inspection results', () => {
  it('keeps successful resources separate from safe failure details', () => {
    expect(RESOURCE_RESULTS[0]).toMatchObject({ ok: true, resource: INSPECTED_RESOURCE })

    for (const result of RESOURCE_RESULTS.slice(1)) {
      if (result.ok) {
        expect(result.resource).toEqual(INSPECTED_RESOURCE)
      } else {
        expect(result.failure.safeMessage).toBeTruthy()
        expect(result).not.toHaveProperty('failure.evidence.rawBody')
        expect(result).not.toHaveProperty('failure.evidence.rawIp')
      }
    }
  })
})
