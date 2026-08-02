import { preflightSubmission } from '@/actions/preflight-submission'
import { submitLlmsTxt } from '@/actions/submit-llms-xxt'
import { SubmitForm } from '@/components/forms/submit-form'
import { act, cleanup, fireEvent, render, screen, waitFor } from '@/test/test-utils'
import {
  finishSubmissionSupport,
  reachSubmissionDetails,
  reachSubmissionSupport,
  SUBMISSION_METADATA,
  submitDetails
} from './submit-form-test-helpers'

const mockTrackFormStepStart = jest.fn()

jest.mock('@/actions/preflight-submission', () => ({ preflightSubmission: jest.fn() }))
jest.mock('@/actions/submit-llms-xxt', () => ({ submitLlmsTxt: jest.fn() }))
jest.mock('@/components/analytics-tracker', () => ({
  useAnalyticsEvents: () => ({
    trackFetchMetadataError: jest.fn(),
    trackFetchMetadataSuccess: jest.fn(),
    trackFormStepComplete: jest.fn(),
    trackFormStepStart: mockTrackFormStepStart,
    trackSubmitError: jest.fn(),
    trackSubmitSuccess: jest.fn()
  }),
  useSubmissionAnalytics: () => ({
    failFinal: jest.fn(),
    failPreflight: jest.fn(),
    finishFinal: jest.fn(),
    finishPreflight: jest.fn(),
    startFinal: jest.fn(() => 0),
    startPreflight: jest.fn(() => 0),
    trackSubmissionFollowAttest: jest.fn(),
    trackSubmissionProfileOpen: jest.fn(),
    trackSubmissionSupportPlatformSelect: jest.fn()
  })
}))

describe('SubmitForm request concurrency', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('disables every details control and prevents reset or edits during preflight', async () => {
    const user = await reachSubmissionDetails()
    let resolvePreflight: (result: Awaited<ReturnType<typeof preflightSubmission>>) => void = () =>
      undefined
    const preflightPromise = new Promise<Awaited<ReturnType<typeof preflightSubmission>>>(
      resolve => {
        resolvePreflight = resolve
      }
    )
    jest.mocked(preflightSubmission).mockImplementationOnce(() => preflightPromise)
    const name = screen.getByLabelText(/^name/i)
    const originalName = name.getAttribute('value')

    submitDetails()

    await waitFor(() => {
      expect(screen.getByRole('group', { name: /website details/i })).toBeDisabled()
    })
    expect(screen.getByRole('group', { name: /website details/i })).toHaveClass(
      'min-w-0',
      'space-y-8'
    )
    expect(screen.getByRole('group', { name: /website details/i })).not.toHaveClass('contents')
    expect(screen.getByRole('button', { name: /reset/i })).toBeDisabled()
    expect(name).toBeDisabled()
    await user.type(name, 'Changed')
    fireEvent.click(screen.getByRole('button', { name: /reset/i }))
    expect(name).toHaveValue(originalName)
    expect(preflightSubmission).toHaveBeenCalledTimes(1)

    await act(async () => {
      resolvePreflight({
        analytics: { reasonCategory: 'passed', webRiskAvailable: true },
        continuationToken: 'opaque-token',
        status: 'support_required',
        submissionId: 'sub_123'
      })
      await preflightPromise
    })
    expect(
      await screen.findByRole('heading', { name: /support the maintainer/i })
    ).toBeInTheDocument()
  })

  it('ignores a preflight completion after the form unmounts', async () => {
    global.fetch = jest.fn().mockResolvedValueOnce(
      new Response(JSON.stringify({ isDuplicate: false, metadata: SUBMISSION_METADATA }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      })
    )
    const view = render(<SubmitForm />)
    fireEvent.change(screen.getByLabelText(/website url/i), {
      target: { value: 'https://example.com' }
    })
    fireEvent.submit(screen.getByRole('button', { name: /get website details/i }).closest('form')!)
    await screen.findByRole('button', { name: /continue to support/i })
    let resolvePreflight: (result: Awaited<ReturnType<typeof preflightSubmission>>) => void = () =>
      undefined
    const preflightPromise = new Promise<Awaited<ReturnType<typeof preflightSubmission>>>(
      resolve => {
        resolvePreflight = resolve
      }
    )
    jest.mocked(preflightSubmission).mockImplementationOnce(() => preflightPromise)
    submitDetails()
    await screen.findByRole('button', { name: /checking/i })
    view.unmount()

    await act(async () => {
      resolvePreflight({
        analytics: { reasonCategory: 'passed', webRiskAvailable: true },
        continuationToken: 'stale-token',
        status: 'support_required',
        submissionId: 'stale-submission'
      })
      await preflightPromise
    })
    expect(mockTrackFormStepStart).not.toHaveBeenCalledWith(3, 'submit-form', 'submit-page')
  })

  it('ignores a final completion after unmount and keeps support navigation locked', async () => {
    const user = await reachSubmissionSupport()
    let resolveFinal: (result: Awaited<ReturnType<typeof submitLlmsTxt>>) => void = () => undefined
    const finalPromise = new Promise<Awaited<ReturnType<typeof submitLlmsTxt>>>(resolve => {
      resolveFinal = resolve
    })
    jest.mocked(submitLlmsTxt).mockImplementationOnce(() => finalPromise)

    await finishSubmissionSupport(user)
    await waitFor(() => expect(submitLlmsTxt).toHaveBeenCalledTimes(1))
    expect(screen.getByRole('button', { name: /back to details/i })).toBeDisabled()
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
      await finalPromise
    })
    expect(mockTrackFormStepStart).not.toHaveBeenCalledWith(4, 'submit-form', 'submit-page')
  })
})
