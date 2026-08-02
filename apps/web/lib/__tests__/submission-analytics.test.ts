import { ANALYTICS_EVENTS } from '@/lib/analytics'
import { analytics, submissionAnalytics } from '@/lib/analytics-helpers'

const originalEnvironment = process.env
const track = jest.fn()

describe('submission analytics', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    process.env = { ...originalEnvironment, NODE_ENV: 'production' }
    Object.defineProperty(window, 'op', {
      configurable: true,
      value: { track }
    })
  })

  afterAll(() => {
    process.env = originalEnvironment
  })

  it('uses a stable event for every trusted-submission lifecycle signal', () => {
    expect(ANALYTICS_EVENTS).toMatchObject({
      SUBMISSION_PAGE_VIEW: 'Submission Page View',
      SUBMISSION_REQUEST_DURATION: 'Submission Request Duration',
      SUBMISSION_FINAL_OUTCOME: 'Submission Final Outcome',
      SUBMISSION_FOLLOW_ATTEST: 'Submission Follow Attest',
      SUBMISSION_SUPPORT_BACK: 'Submission Support Back',
      SUBMISSION_FINAL_START: 'Submission Final Start',
      SUBMISSION_PREFLIGHT_OUTCOME: 'Submission Preflight Outcome',
      SUBMISSION_PREFLIGHT_START: 'Submission Preflight Start',
      SUBMISSION_PROFILE_OPEN: 'Submission Profile Open',
      SUBMISSION_PR_CREATED: 'Submission PR Created',
      SUBMISSION_PUBLISH_FAILURE: 'Submission Publish Failure',
      SUBMISSION_SUPPORT_PLATFORM_SELECT: 'Submission Support Platform Select',
      SUBMISSION_SUPPORT_VIEW: 'Submission Support View',
      SUBMISSION_WEB_RISK_AVAILABLE: 'Submission Web Risk Available',
      SUBMISSION_WEB_RISK_UNAVAILABLE: 'Submission Web Risk Unavailable'
    })
  })

  it('retains only allowlisted aggregate properties from hostile caller input', () => {
    submissionAnalytics.finalOutcome({
      apiKey: 'secret-api-key',
      attemptId: '123e4567-e89b-42d3-a456-426614174000',
      continuationToken: 'opaque-token',
      decision: 'automatic',
      durationBucket: '1s_to_5s',
      fetchedContent: '# private response body',
      platform: 'x',
      prPresent: true,
      providerBody: '{"threat":true}',
      rawIp: '203.0.113.1',
      reasonCategory: 'passed',
      signature: 'signed-secret',
      socialUsername: '@private-user',
      source: 'final_submission',
      url: 'https://private.example/llms.txt'
    })

    expect(track).toHaveBeenCalledWith(ANALYTICS_EVENTS.SUBMISSION_FINAL_OUTCOME, {
      attempt_id: '123e4567-e89b-42d3-a456-426614174000',
      decision: 'automatic',
      duration_bucket: '1s_to_5s',
      platform: 'x',
      pr_present: true,
      reason_category: 'passed',
      source: 'final_submission'
    })
    expect(JSON.stringify(track.mock.calls)).not.toMatch(
      /secret-api-key|opaque-token|private response|203\.0\.113\.1|signed-secret|private-user|private\.example|providerBody/
    )
  })

  it('drops invalid values instead of forwarding arbitrary strings', () => {
    submissionAnalytics.preflightOutcome({
      decision: 'https://private.example',
      durationBucket: 'forever',
      platform: 'threads',
      prPresent: 'yes',
      reasonCategory: 'secret_reason',
      source: 'user-controlled-source',
      attemptId: 'not-a-valid-attempt-id'
    })

    expect(track).toHaveBeenCalledWith(ANALYTICS_EVENTS.SUBMISSION_PREFLIGHT_OUTCOME, {})
  })

  it('keeps legacy submission metadata events free of URLs and raw errors', () => {
    analytics.fetchMetadataSuccess('https://private.example', 'submit-page')
    analytics.fetchMetadataError(
      'https://private.example',
      'provider returned secret-api-key',
      'submit-page'
    )

    expect(track).toHaveBeenNthCalledWith(1, ANALYTICS_EVENTS.FETCH_METADATA_SUCCESS, {
      source: 'submit-page'
    })
    expect(track).toHaveBeenNthCalledWith(2, ANALYTICS_EVENTS.FETCH_METADATA_ERROR, {
      source: 'submit-page'
    })
    expect(JSON.stringify(track.mock.calls)).not.toMatch(/private\.example|secret-api-key/)
  })

  it.each([
    [0, 'under_1s'],
    [999, 'under_1s'],
    [1000, '1s_to_5s'],
    [5000, '1s_to_5s'],
    [5001, 'over_5s']
  ] as const)('buckets %i milliseconds as %s', (durationMs, expected) => {
    expect(submissionAnalytics.durationBucket(durationMs)).toBe(expected)
  })

  it.each([
    ['passed', 'passed'],
    ['duplicate', 'duplicate'],
    ['rate_limited', 'rate_limit'],
    ['unsafe_network_target', 'network_safety'],
    ['reputation_match', 'network_safety'],
    ['reputation_unknown', 'reputation_unavailable'],
    ['required_resource_missing', 'resource'],
    ['invalid_optional_resource', 'resource'],
    ['site_family_uncertain', 'site_ownership'],
    ['editorial_uncertainty', 'editorial'],
    ['publication_unavailable', 'publication'],
    ['unexpected-provider-body', 'unknown']
  ] as const)('categorizes %s as %s', (reasonCode, expected) => {
    expect(submissionAnalytics.reasonCategory(reasonCode)).toBe(expected)
  })
})
