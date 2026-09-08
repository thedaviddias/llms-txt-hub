jest.mock('@/actions/record-submission-support', () => ({
  recordSubmissionSupport: jest.fn().mockResolvedValue({ success: true, token: 'support-receipt' })
}))

import { type PreflightResult, preflightSubmission } from '@/actions/preflight-submission'
import { type FinalSubmissionResult, submitLlmsTxt } from '@/actions/submit-llms-xxt'
import { fireEvent, screen, waitFor } from '@/test/test-utils'
import {
  prepareSubmission,
  reachSubmissionDetails,
  SUBMISSION_METADATA,
  submitDetails,
  submitPreparedDetails
} from './submit-form-test-helpers'

jest.mock('@/actions/preflight-submission', () => ({
  preflightSubmission: jest.fn()
}))

jest.mock('@/actions/submit-llms-xxt', () => ({
  submitLlmsTxt: jest.fn()
}))

describe('SubmitForm', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    jest.mocked(preflightSubmission).mockReset()
    jest
      .mocked(submitLlmsTxt)
      .mockReset()
      .mockResolvedValue({
        success: true,
        outcome: 'manual',
        prUrl: 'https://github.com/thedaviddias/llms-txt-hub/pull/123',
        analytics: {
          publicationAttempted: true,
          prCreated: true,
          prPresent: true,
          reasonCategory: 'passed'
        }
      })
  })

  it.each([
    {
      result: {
        analytics: { reasonCategory: 'network_safety', webRiskAvailable: true },
        message: 'This submitted link is not eligible for publication.',
        reasonCode: 'reputation_match',
        status: 'rejected'
      },
      message: 'This submitted link is not eligible for publication.'
    },
    {
      result: {
        analytics: { reasonCategory: 'publication' },
        message:
          'We could not safely verify this site right now. Nothing was published. Please try again later.',
        reasonCode: 'publication_unavailable',
        status: 'retry_later'
      },
      message:
        'We could not safely verify this site right now. Nothing was published. Please try again later.'
    }
  ] satisfies ReadonlyArray<{ message: string; result: PreflightResult }>)(
    'stops at the $result.status preflight outcome without support or GitHub',
    async testCase => {
      await reachSubmissionDetails()
      jest.mocked(preflightSubmission).mockResolvedValueOnce(testCase.result)

      submitDetails()

      expect(await screen.findByText(testCase.message)).toBeInTheDocument()
      expect(
        screen.queryByRole('heading', { name: /support the maintainer/i })
      ).not.toBeInTheDocument()
      expect(screen.queryByRole('link', { name: /github/i })).not.toBeInTheDocument()
      expect(submitLlmsTxt).not.toHaveBeenCalled()
    }
  )

  it.each([
    {
      copy: 'Your submission passed our checks and will be published automatically after repository validation.',
      outcome: 'automatic'
    },
    {
      copy: 'Your submission is safe to review, but one or more directory guidelines need a maintainer decision.',
      outcome: 'manual'
    }
  ] satisfies ReadonlyArray<{
    copy: string
    outcome: Extract<FinalSubmissionResult, { success: true }>['outcome']
  }>)(
    'shows truthful $outcome publication copy and a PR link only after success',
    async testCase => {
      const user = await prepareSubmission()
      jest.mocked(submitLlmsTxt).mockResolvedValueOnce({
        analytics: {
          publicationAttempted: true,
          prCreated: true,
          prPresent: true,
          reasonCategory: 'passed',
          webRiskAvailable: true
        },
        outcome: testCase.outcome,
        prUrl: 'https://github.com/thedaviddias/llms-txt-hub/pull/123',
        success: true
      })

      await submitPreparedDetails(user)

      expect(await screen.findByText(testCase.copy)).toBeInTheDocument()
      const heading = screen.getByRole('heading', {
        name:
          testCase.outcome === 'automatic' ? 'Submission accepted' : 'Submission ready for review'
      })
      expect(heading).toHaveFocus()
      expect(screen.getByRole('status', { name: heading.textContent ?? '' })).toBeInTheDocument()
      expect(screen.getByRole('link', { name: /view pull request/i })).toHaveAttribute(
        'href',
        'https://github.com/thedaviddias/llms-txt-hub/pull/123'
      )
    }
  )

  it.each([
    {
      error: 'This site failed the final safety assessment.',
      outcome: 'rejected'
    },
    {
      error:
        'We could not safely verify this site right now. Nothing was published. Please try again later.',
      outcome: 'retry_later'
    }
  ] satisfies ReadonlyArray<{
    error: string
    outcome: Extract<FinalSubmissionResult, { success: false }>['outcome']
  }>)('shows the final $outcome without a PR link', async testCase => {
    const user = await prepareSubmission()
    jest.mocked(submitLlmsTxt).mockResolvedValueOnce({
      analytics: {
        publicationAttempted: false,
        prCreated: false,
        prPresent: false,
        reasonCategory:
          testCase.outcome === 'rejected' ? 'network_safety' : 'reputation_unavailable',
        webRiskAvailable: testCase.outcome === 'rejected'
      },
      error: testCase.error,
      outcome: testCase.outcome,
      success: false
    })

    await submitPreparedDetails(user)

    expect(await screen.findByText(testCase.error)).toBeInTheDocument()
    const heading = screen.getByRole('heading', {
      name:
        testCase.outcome === 'rejected' ? 'Submission not published' : 'Verification unavailable'
    })
    expect(heading).toHaveFocus()
    expect(screen.getByRole('alert', { name: heading.textContent ?? '' })).toBeInTheDocument()
    expect(screen.queryByRole('link', { name: /pull request/i })).not.toBeInTheDocument()
  })

  it('focuses the editable details before the combined submission', async () => {
    await prepareSubmission()
    expect(screen.getByLabelText(/^name/i)).toHaveFocus()
  })

  it('submits the unchanged preflight fields with only the opaque continuation and attestation', async () => {
    const user = await prepareSubmission()
    jest.mocked(submitLlmsTxt).mockResolvedValueOnce({
      analytics: {
        publicationAttempted: true,
        prCreated: true,
        prPresent: true,
        reasonCategory: 'passed',
        webRiskAvailable: true
      },
      outcome: 'manual',
      prUrl: 'https://github.com/thedaviddias/llms-txt-hub/pull/123',
      success: true
    })

    await submitPreparedDetails(user)

    const submitted = jest.mocked(submitLlmsTxt).mock.calls[0]?.[0]
    expect(submitted).toBeInstanceOf(FormData)
    expect(Object.fromEntries(submitted?.entries() ?? [])).toMatchObject({
      continuationToken: 'opaque-token',
      description: SUBMISSION_METADATA.description,
      supportToken: 'support-receipt',
      llmsUrl: SUBMISSION_METADATA.llmsUrl,
      name: SUBMISSION_METADATA.name,
      supportPlatform: 'x',
      website: 'https://example.com'
    })
    expect(Object.fromEntries(submitted?.entries() ?? [])).not.toHaveProperty('socialUsername')
    expect(Object.fromEntries(submitted?.entries() ?? [])).not.toHaveProperty('submissionId')
  })

  it('invalidates the continuation when returning to change details and requires preflight again', async () => {
    const user = await prepareSubmission()
    jest.mocked(submitLlmsTxt).mockRejectedValueOnce(new Error('Response lost'))
    await submitPreparedDetails(user)
    await screen.findByRole('button', { name: /retry submission/i })
    await user.click(screen.getByRole('button', { name: /edit details/i }))
    await user.clear(screen.getByLabelText(/^name/i))
    await user.type(screen.getByLabelText(/^name/i), 'Changed Example')
    jest.mocked(preflightSubmission).mockResolvedValueOnce({
      analytics: { reasonCategory: 'passed', webRiskAvailable: true },
      continuationToken: 'new-opaque-token',
      status: 'support_required',
      submissionId: 'sub_456'
    })
    submitDetails()
    await screen.findByRole('link', { name: /view pull request/i })
    expect(preflightSubmission).toHaveBeenCalledTimes(2)
    expect(jest.mocked(submitLlmsTxt).mock.calls[1]?.[0].get('name')).toBe('Changed Example')
    expect(jest.mocked(submitLlmsTxt).mock.calls[1]?.[0].get('continuationToken')).toBe(
      'new-opaque-token'
    )
  })

  it('prevents duplicate preflight submission while the request is in progress', async () => {
    await reachSubmissionDetails()
    let resolvePreflight:
      | ((value: Awaited<ReturnType<typeof preflightSubmission>>) => void)
      | undefined
    jest.mocked(preflightSubmission).mockImplementationOnce(
      () =>
        new Promise(resolve => {
          resolvePreflight = resolve
        })
    )
    const continueButton = screen.getByRole('button', { name: /submit listing/i })
    const detailsForm = continueButton.closest('form')
    if (!detailsForm) throw new Error('Details form was not rendered')
    fireEvent.submit(detailsForm)
    fireEvent.submit(detailsForm)

    await waitFor(() => {
      expect(preflightSubmission).toHaveBeenCalledTimes(1)
      expect(continueButton).toBeDisabled()
    })
    resolvePreflight?.({
      analytics: { reasonCategory: 'passed', webRiskAvailable: true },
      continuationToken: 'opaque-token',
      status: 'support_required',
      submissionId: 'sub_123'
    })
    expect(
      await screen.findByRole('heading', { name: /submission ready for review/i })
    ).toBeInTheDocument()
  })

  it('prevents duplicate final submission while publication is in progress', async () => {
    await prepareSubmission()
    let resolveFinal: ((value: Awaited<ReturnType<typeof submitLlmsTxt>>) => void) | undefined
    jest.mocked(submitLlmsTxt).mockImplementationOnce(
      () =>
        new Promise(resolve => {
          resolveFinal = resolve
        })
    )
    submitDetails()
    submitDetails()
    await waitFor(() => expect(submitLlmsTxt).toHaveBeenCalledTimes(1))
    expect(screen.getByRole('button', { name: /submitting/i })).toBeDisabled()
    resolveFinal?.({
      analytics: {
        publicationAttempted: true,
        prCreated: true,
        prPresent: true,
        reasonCategory: 'passed',
        webRiskAvailable: true
      },
      outcome: 'manual',
      prUrl: 'https://github.com/thedaviddias/llms-txt-hub/pull/123',
      success: true
    })
    expect(await screen.findByText(/safe to review/i)).toBeInTheDocument()
  })

  it.each([
    {
      error: 'This submission confirmation is invalid or has expired. Start again.',
      scenario: 'expired continuation'
    },
    {
      error:
        'We could not safely verify this site right now. Nothing was published. Please try again later.',
      scenario: 'publication already in progress'
    },
    {
      error:
        'We could not safely verify this site right now. Nothing was published. Please try again later.',
      scenario: 'fresh preflight required'
    }
  ])('recovers safely when $scenario', async testCase => {
    const user = await prepareSubmission()
    jest.mocked(submitLlmsTxt).mockResolvedValueOnce({
      analytics: {
        publicationAttempted: false,
        prCreated: false,
        prPresent: false,
        reasonCategory: testCase.error.includes('expired') ? 'continuation' : 'publication'
      },
      error: testCase.error,
      outcome: testCase.error.includes('expired') ? 'rejected' : 'retry_later',
      success: false
    })

    await submitPreparedDetails(user)

    expect(await screen.findByText(testCase.error)).toBeInTheDocument()
    expect(screen.queryByRole('link', { name: /pull request/i })).not.toBeInTheDocument()
  })
})
