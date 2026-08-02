import { createElement } from 'react'
import { preflightSubmission } from '@/actions/preflight-submission'
import { type FinalSubmissionResult, submitLlmsTxt } from '@/actions/submit-llms-xxt'
import {
  finishSubmissionSupport,
  reachSubmissionDetails,
  reachSubmissionSupport,
  submitDetails
} from '@/components/forms/__tests__/submit-form-test-helpers'
import { SubmitFormSupport } from '@/components/forms/submit-form-support'
import { useSubmissionAnalytics as useActualSubmissionAnalytics } from '@/components/submission-analytics-tracker'
import { ANALYTICS_EVENTS } from '@/lib/analytics'
import { act, cleanup, render, renderHook, screen, userEvent } from '@/test/test-utils'

const mockStartPreflight = jest.fn(() => 100)
const mockFinishPreflight = jest.fn()
const mockFailPreflight = jest.fn()
const mockStartFinal = jest.fn(() => 200)
const mockFinishFinal = jest.fn()
const mockFailFinal = jest.fn()
const mockPlatformSelect = jest.fn()
const mockProfileOpen = jest.fn()
const mockFollowAttest = jest.fn()
const mockSupportBack = jest.fn()
const mockPageView = jest.fn()
const track = jest.fn()
const originalEnvironment = process.env
const TEST_ATTEMPT_ID = '123e4567-e89b-42d3-a456-426614174000'

jest.mock('@/actions/preflight-submission', () => ({ preflightSubmission: jest.fn() }))
jest.mock('@/actions/submit-llms-xxt', () => ({ submitLlmsTxt: jest.fn() }))
jest.mock('@/components/analytics-tracker', () => ({
  useAnalyticsEvents: () => ({
    trackFetchMetadataError: jest.fn(),
    trackFetchMetadataSuccess: jest.fn(),
    trackFormStepComplete: jest.fn(),
    trackFormStepStart: jest.fn()
  }),
  useSubmissionAnalytics: () => ({
    failFinal: mockFailFinal,
    failPreflight: mockFailPreflight,
    finishFinal: mockFinishFinal,
    finishPreflight: mockFinishPreflight,
    getAttemptId: () => TEST_ATTEMPT_ID,
    startFinal: mockStartFinal,
    startPreflight: mockStartPreflight,
    trackSubmissionPageView: mockPageView,
    trackSubmissionFollowAttest: mockFollowAttest,
    trackSubmissionProfileOpen: mockProfileOpen,
    trackSubmissionSupportBack: mockSupportBack,
    trackSubmissionSupportPlatformSelect: mockPlatformSelect
  })
}))

describe('trusted submission analytics lifecycle', () => {
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

  it('tracks a current preflight once and never sends the submitted URL', async () => {
    await reachSubmissionDetails()
    jest.mocked(preflightSubmission).mockResolvedValueOnce({
      analytics: { reasonCategory: 'passed', webRiskAvailable: true },
      continuationToken: 'opaque-token',
      status: 'support_required',
      submissionId: 'sub_123'
    })

    submitDetails()
    await screen.findByRole('heading', { name: /support the maintainer/i })

    expect(mockPageView).toHaveBeenCalledTimes(1)
    expect(mockStartPreflight).toHaveBeenCalledTimes(1)
    expect(mockFinishPreflight).toHaveBeenCalledWith(
      {
        analytics: { reasonCategory: 'passed', webRiskAvailable: true },
        continuationToken: 'opaque-token',
        status: 'support_required',
        submissionId: 'sub_123'
      },
      100
    )
    expect(JSON.stringify(mockFinishPreflight.mock.calls)).not.toContain('example.com')
  })

  it('does not track an outcome from a stale preflight response', async () => {
    await reachSubmissionDetails()
    let resolvePreflight: (result: Awaited<ReturnType<typeof preflightSubmission>>) => void = () =>
      undefined
    const pending = new Promise<Awaited<ReturnType<typeof preflightSubmission>>>(resolve => {
      resolvePreflight = resolve
    })
    jest.mocked(preflightSubmission).mockImplementationOnce(() => pending)
    submitDetails()
    cleanup()

    await act(async () => {
      resolvePreflight({
        analytics: { reasonCategory: 'passed', webRiskAvailable: true },
        continuationToken: 'stale-token',
        status: 'support_required',
        submissionId: 'stale-submission'
      })
      await pending
    })

    expect(mockStartPreflight).toHaveBeenCalledTimes(1)
    expect(mockFinishPreflight).not.toHaveBeenCalled()
    expect(mockFailPreflight).not.toHaveBeenCalled()
  })

  it('tracks the selected platform interactions without a social username', async () => {
    const user = userEvent.setup()
    render(
      createElement(SubmitFormSupport, {
        attemptId: TEST_ATTEMPT_ID,
        isLoading: false,
        onBack: jest.fn(),
        onSubmit: jest.fn()
      })
    )

    await user.click(screen.getByRole('radio', { name: 'Follow David on LinkedIn' }))
    await user.click(screen.getByRole('link', { name: /open david's linkedin profile/i }))
    await user.click(screen.getByRole('checkbox', { name: 'I follow David on this platform' }))
    await user.click(screen.getByRole('button', { name: /back to details/i }))

    expect(mockPlatformSelect).toHaveBeenCalledWith({
      attemptId: TEST_ATTEMPT_ID,
      platform: 'linkedin',
      source: 'support_step'
    })
    expect(mockProfileOpen).toHaveBeenCalledWith({
      attemptId: TEST_ATTEMPT_ID,
      platform: 'linkedin',
      source: 'support_step'
    })
    expect(mockFollowAttest).toHaveBeenCalledWith({
      attemptId: TEST_ATTEMPT_ID,
      platform: 'linkedin',
      source: 'support_step'
    })
    expect(mockSupportBack).toHaveBeenCalledWith({
      attemptId: TEST_ATTEMPT_ID,
      source: 'support_step'
    })
    expect(JSON.stringify(mockFollowAttest.mock.calls)).not.toMatch(/username|thedaviddias/)
  })

  it('tracks a current PR result using only aggregate publication facts', async () => {
    const user = await reachSubmissionSupport()
    jest.mocked(submitLlmsTxt).mockResolvedValueOnce({
      analytics: {
        publicationAttempted: true,
        prCreated: true,
        prPresent: true,
        reasonCategory: 'passed',
        webRiskAvailable: true
      },
      outcome: 'automatic',
      prUrl: 'https://github.com/thedaviddias/llms-txt-hub/pull/123',
      success: true
    })

    await finishSubmissionSupport(user)

    expect(mockStartFinal).toHaveBeenCalledWith('x')
    expect(mockFinishFinal).toHaveBeenCalledWith(
      {
        analytics: {
          publicationAttempted: true,
          prCreated: true,
          prPresent: true,
          reasonCategory: 'passed',
          webRiskAvailable: true
        },
        outcome: 'automatic',
        prUrl: 'https://github.com/thedaviddias/llms-txt-hub/pull/123',
        success: true
      },
      'x',
      200
    )
    expect(mockFailFinal).not.toHaveBeenCalled()
  })

  it('orchestrates aggregate events without forwarding opaque result fields', () => {
    const view = renderHook(() => useActualSubmissionAnalytics())

    act(() => {
      view.result.current.finishPreflight(
        {
          analytics: { reasonCategory: 'passed', webRiskAvailable: true },
          continuationToken: 'opaque-token',
          status: 'support_required',
          submissionId: 'sub_123'
        },
        Date.now()
      )
    })

    expect(track).toHaveBeenCalledWith(ANALYTICS_EVENTS.SUBMISSION_PREFLIGHT_OUTCOME, {
      decision: 'support_required',
      reason_category: 'passed',
      source: 'preflight'
    })
    expect(track).toHaveBeenCalledWith(ANALYTICS_EVENTS.SUBMISSION_SUPPORT_VIEW, {
      source: 'support_step'
    })
    expect(track).toHaveBeenCalledWith(ANALYTICS_EVENTS.SUBMISSION_WEB_RISK_AVAILABLE, {
      source: 'preflight'
    })
    expect(track).toHaveBeenCalledWith(ANALYTICS_EVENTS.SUBMISSION_REQUEST_DURATION, {
      duration_bucket: 'under_1s',
      source: 'preflight'
    })
    expect(JSON.stringify(track.mock.calls)).not.toMatch(/opaque-token|sub_123/)
  })

  it('correlates each attempt from preflight click through final submission click', () => {
    const view = renderHook(() => useActualSubmissionAnalytics())

    act(() => {
      const startedAt = view.result.current.startPreflight()
      view.result.current.finishPreflight(
        {
          analytics: { reasonCategory: 'passed', webRiskAvailable: true },
          continuationToken: 'opaque-token',
          status: 'support_required',
          submissionId: 'sub_123'
        },
        startedAt
      )
      view.result.current.startFinal('linkedin')
    })

    const preflightStart = track.mock.calls.find(
      call => call[0] === ANALYTICS_EVENTS.SUBMISSION_PREFLIGHT_START
    )
    const attemptId = preflightStart?.[1]?.attempt_id
    expect(attemptId).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
    )
    for (const event of [
      ANALYTICS_EVENTS.SUBMISSION_PREFLIGHT_START,
      ANALYTICS_EVENTS.SUBMISSION_PREFLIGHT_OUTCOME,
      ANALYTICS_EVENTS.SUBMISSION_SUPPORT_VIEW,
      ANALYTICS_EVENTS.SUBMISSION_FINAL_START
    ]) {
      expect(track).toHaveBeenCalledWith(event, expect.objectContaining({ attempt_id: attemptId }))
    }
    expect(track).toHaveBeenCalledWith(ANALYTICS_EVENTS.SUBMISSION_FINAL_START, {
      attempt_id: attemptId,
      platform: 'linkedin',
      source: 'final_submission'
    })
    expect(JSON.stringify(track.mock.calls)).not.toMatch(/opaque-token|sub_123/)
  })

  it.each([
    ['editorial rejection after a safe check', 'editorial', true, 'available'],
    ['hidden reputation uncertainty', 'editorial', false, 'unavailable']
  ] as const)('tracks %s from server metadata', (_label, reasonCategory, available, event) => {
    const view = renderHook(() => useActualSubmissionAnalytics())

    act(() => {
      view.result.current.finishPreflight(
        {
          analytics: { reasonCategory, webRiskAvailable: available },
          message: 'Safe public message.',
          reasonCode: 'prohibited_content',
          status: 'rejected'
        },
        Date.now()
      )
    })

    expect(track).toHaveBeenCalledWith(ANALYTICS_EVENTS.SUBMISSION_PREFLIGHT_OUTCOME, {
      decision: 'rejected',
      reason_category: 'editorial',
      source: 'preflight'
    })
    expect(track).toHaveBeenCalledWith(
      event === 'available'
        ? ANALYTICS_EVENTS.SUBMISSION_WEB_RISK_AVAILABLE
        : ANALYTICS_EVENTS.SUBMISSION_WEB_RISK_UNAVAILABLE,
      { source: 'preflight' }
    )
  })

  it.each([
    [true, 1],
    [false, 0]
  ] as const)(
    'emits publish failure only when publicationAttempted is %s',
    (publicationAttempted, expectedFailures) => {
      const view = renderHook(() => useActualSubmissionAnalytics())

      act(() => {
        view.result.current.finishFinal(
          {
            analytics: {
              publicationAttempted,
              prCreated: false,
              prPresent: false,
              reasonCategory: 'publication',
              webRiskAvailable: true
            },
            error: 'Provider body with secret-api-key',
            outcome: 'retry_later',
            success: false
          },
          'x',
          Date.now()
        )
      })

      expect(
        track.mock.calls.filter(call => call[0] === ANALYTICS_EVENTS.SUBMISSION_PUBLISH_FAILURE)
      ).toHaveLength(expectedFailures)
      expect(track).toHaveBeenCalledWith(ANALYTICS_EVENTS.SUBMISSION_FINAL_OUTCOME, {
        decision: 'retry_later',
        platform: 'x',
        pr_present: false,
        reason_category: 'publication',
        source: 'final_submission'
      })
      expect(JSON.stringify(track.mock.calls)).not.toMatch(/secret-api-key|Provider body/)
    }
  )

  it.each([
    [true, 1],
    [false, 0]
  ] as const)('emits PR Created only when the server reports prCreated=%s', (prCreated, count) => {
    const view = renderHook(() => useActualSubmissionAnalytics())

    act(() => {
      view.result.current.finishFinal(
        {
          analytics: {
            publicationAttempted: true,
            prCreated,
            prPresent: true,
            reasonCategory: 'passed',
            webRiskAvailable: true
          },
          outcome: 'automatic',
          prUrl: 'https://github.com/thedaviddias/llms-txt-hub/pull/123',
          success: true
        },
        'x',
        Date.now()
      )
    })

    expect(
      track.mock.calls.filter(call => call[0] === ANALYTICS_EVENTS.SUBMISSION_PR_CREATED)
    ).toHaveLength(count)
    expect(JSON.stringify(track.mock.calls)).not.toContain('/pull/123')
  })

  it('tracks both a confirmed PR and the subsequent publication failure', () => {
    const view = renderHook(() => useActualSubmissionAnalytics())

    act(() => {
      view.result.current.finishFinal(
        {
          analytics: {
            publicationAttempted: true,
            prCreated: true,
            prPresent: true,
            reasonCategory: 'publication',
            webRiskAvailable: true
          },
          error: 'Publication failed after creating the PR.',
          outcome: 'retry_later',
          success: false
        },
        'linkedin',
        Date.now()
      )
    })

    expect(track).toHaveBeenCalledWith(ANALYTICS_EVENTS.SUBMISSION_PR_CREATED, {
      decision: 'retry_later',
      platform: 'linkedin',
      pr_present: true,
      source: 'final_submission'
    })
    expect(track).toHaveBeenCalledWith(ANALYTICS_EVENTS.SUBMISSION_FINAL_OUTCOME, {
      decision: 'retry_later',
      platform: 'linkedin',
      pr_present: true,
      reason_category: 'publication',
      source: 'final_submission'
    })
    expect(track).toHaveBeenCalledWith(ANALYTICS_EVENTS.SUBMISSION_PUBLISH_FAILURE, {
      decision: 'retry_later',
      platform: 'linkedin',
      pr_present: true,
      reason_category: 'publication',
      source: 'final_submission'
    })
  })

  it('tracks an existing PR on failure without claiming it was newly created', () => {
    const view = renderHook(() => useActualSubmissionAnalytics())

    act(() => {
      view.result.current.finishFinal(
        {
          analytics: {
            publicationAttempted: true,
            prCreated: false,
            prPresent: true,
            reasonCategory: 'publication',
            webRiskAvailable: true
          },
          error: 'Existing PR recovery failed.',
          outcome: 'retry_later',
          success: false
        },
        'x',
        Date.now()
      )
    })

    expect(track).toHaveBeenCalledWith(ANALYTICS_EVENTS.SUBMISSION_FINAL_OUTCOME, {
      decision: 'retry_later',
      platform: 'x',
      pr_present: true,
      reason_category: 'publication',
      source: 'final_submission'
    })
    expect(track).toHaveBeenCalledWith(ANALYTICS_EVENTS.SUBMISSION_PUBLISH_FAILURE, {
      decision: 'retry_later',
      platform: 'x',
      pr_present: true,
      reason_category: 'publication',
      source: 'final_submission'
    })
    expect(
      track.mock.calls.filter(call => call[0] === ANALYTICS_EVENTS.SUBMISSION_PR_CREATED)
    ).toHaveLength(0)
  })

  it('uses unknown for client-thrown failures without claiming publication failure', () => {
    const view = renderHook(() => useActualSubmissionAnalytics())

    act(() => {
      view.result.current.failPreflight(Date.now())
      view.result.current.failFinal('linkedin', Date.now())
    })

    expect(track).toHaveBeenCalledWith(ANALYTICS_EVENTS.SUBMISSION_PREFLIGHT_OUTCOME, {
      decision: 'retry_later',
      reason_category: 'unknown',
      source: 'preflight'
    })
    expect(track).toHaveBeenCalledWith(ANALYTICS_EVENTS.SUBMISSION_FINAL_OUTCOME, {
      decision: 'retry_later',
      platform: 'linkedin',
      pr_present: false,
      reason_category: 'unknown',
      source: 'final_submission'
    })
    expect(track).not.toHaveBeenCalledWith(
      ANALYTICS_EVENTS.SUBMISSION_PUBLISH_FAILURE,
      expect.anything()
    )
  })

  it.each([
    [true, ANALYTICS_EVENTS.SUBMISSION_WEB_RISK_AVAILABLE],
    [false, ANALYTICS_EVENTS.SUBMISSION_WEB_RISK_UNAVAILABLE],
    [undefined, undefined]
  ] as const)(
    'tracks final Web Risk availability %s without hostile properties',
    (webRiskAvailable, expectedEvent) => {
      const view = renderHook(() => useActualSubmissionAnalytics())
      const analytics: FinalSubmissionResult['analytics'] =
        webRiskAvailable === undefined
          ? {
              prCreated: false,
              prPresent: false,
              publicationAttempted: false,
              reasonCategory: 'editorial'
            }
          : {
              prCreated: false,
              prPresent: false,
              publicationAttempted: false,
              reasonCategory: 'editorial',
              webRiskAvailable
            }

      act(() => {
        view.result.current.finishFinal(
          {
            analytics,
            error: 'Hostile provider body with secret-api-key',
            outcome: 'rejected',
            success: false
          },
          'linkedin',
          Date.now()
        )
      })

      const webRiskCalls = track.mock.calls.filter(
        call =>
          call[0] === ANALYTICS_EVENTS.SUBMISSION_WEB_RISK_AVAILABLE ||
          call[0] === ANALYTICS_EVENTS.SUBMISSION_WEB_RISK_UNAVAILABLE
      )
      expect(webRiskCalls).toEqual(
        expectedEvent ? [[expectedEvent, { source: 'final_submission' }]] : []
      )
      expect(JSON.stringify(track.mock.calls)).not.toMatch(/secret-api-key|Hostile provider body/)
    }
  )

  it('does not track a stale final response after unmount', async () => {
    const user = await reachSubmissionSupport()
    let resolveFinal: (result: Awaited<ReturnType<typeof submitLlmsTxt>>) => void = () => undefined
    const pending = new Promise<Awaited<ReturnType<typeof submitLlmsTxt>>>(resolve => {
      resolveFinal = resolve
    })
    jest.mocked(submitLlmsTxt).mockImplementationOnce(() => pending)

    await finishSubmissionSupport(user)
    cleanup()
    await act(async () => {
      resolveFinal({
        analytics: {
          publicationAttempted: true,
          prCreated: false,
          prPresent: true,
          reasonCategory: 'passed',
          webRiskAvailable: true
        },
        outcome: 'manual',
        prUrl: 'https://github.com/thedaviddias/llms-txt-hub/pull/stale',
        success: true
      })
      await pending
    })

    expect(mockFinishFinal).not.toHaveBeenCalled()
    expect(mockFailFinal).not.toHaveBeenCalled()
  })
})
