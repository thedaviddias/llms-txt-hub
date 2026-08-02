import { createElement } from 'react'
import { preflightSubmission } from '@/actions/preflight-submission'
import { submitLlmsTxt } from '@/actions/submit-llms-xxt'
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
const track = jest.fn()
const originalEnvironment = process.env

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
    startFinal: mockStartFinal,
    startPreflight: mockStartPreflight,
    trackSubmissionFollowAttest: mockFollowAttest,
    trackSubmissionProfileOpen: mockProfileOpen,
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
      continuationToken: 'opaque-token',
      status: 'support_required',
      submissionId: 'sub_123'
    })

    submitDetails()
    await screen.findByRole('heading', { name: /support the maintainer/i })

    expect(mockStartPreflight).toHaveBeenCalledTimes(1)
    expect(mockFinishPreflight).toHaveBeenCalledWith(
      {
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
        isLoading: false,
        onBack: jest.fn(),
        onSubmit: jest.fn()
      })
    )

    await user.click(screen.getByRole('radio', { name: 'Follow David on LinkedIn' }))
    await user.click(screen.getByRole('link', { name: /open david's linkedin profile/i }))
    await user.click(screen.getByRole('checkbox', { name: 'I follow David on this platform' }))

    expect(mockPlatformSelect).toHaveBeenCalledWith({
      platform: 'linkedin',
      source: 'support_step'
    })
    expect(mockProfileOpen).toHaveBeenCalledWith({
      platform: 'linkedin',
      source: 'support_step'
    })
    expect(mockFollowAttest).toHaveBeenCalledWith({
      platform: 'linkedin',
      source: 'support_step'
    })
    expect(JSON.stringify(mockFollowAttest.mock.calls)).not.toMatch(/username|thedaviddias/)
  })

  it('tracks a current PR result using only aggregate publication facts', async () => {
    const user = await reachSubmissionSupport()
    jest.mocked(submitLlmsTxt).mockResolvedValueOnce({
      outcome: 'automatic',
      prUrl: 'https://github.com/thedaviddias/llms-txt-hub/pull/123',
      success: true
    })

    await finishSubmissionSupport(user)

    expect(mockStartFinal).toHaveBeenCalledTimes(1)
    expect(mockFinishFinal).toHaveBeenCalledWith(
      {
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
    expect(JSON.stringify(track.mock.calls)).not.toMatch(/opaque-token|sub_123/)
  })
})
