import { preflightSubmission } from '@/actions/preflight-submission'
import { recordSubmissionSupport } from '@/actions/record-submission-support'
import { submitLlmsTxt } from '@/actions/submit-llms-xxt'
import { SubmitForm } from '@/components/forms/submit-form'
import { act, fireEvent, render, screen, userEvent, waitFor } from '@/test/test-utils'
import { SUBMISSION_METADATA } from './submit-form-test-helpers'

jest.mock('@/actions/preflight-submission', () => ({ preflightSubmission: jest.fn() }))
jest.mock('@/actions/record-submission-support', () => ({ recordSubmissionSupport: jest.fn() }))
jest.mock('@/actions/submit-llms-xxt', () => ({ submitLlmsTxt: jest.fn() }))

const enterDetails = async () => {
  const user = userEvent.setup()
  render(<SubmitForm />)
  await user.click(screen.getByRole('link', { name: /follow david on x/i }))
  await user.type(await screen.findByLabelText(/website url/i), 'https://example.com')
  expect(screen.getByLabelText(/website url/i)).toHaveValue('https://example.com')
  const metadataForm = screen.getByRole('button', { name: /get website details/i }).closest('form')
  if (!metadataForm) throw new Error('Expected website form')
  fireEvent.submit(metadataForm)
  await waitFor(() => expect(global.fetch).toHaveBeenCalled())
  await screen.findByLabelText(/^name/i)
  return user
}

const submitListing = () => {
  const form = screen.getByRole('button', { name: /^submit listing$/i }).closest('form')
  if (!form) throw new Error('Expected details form')
  fireEvent.submit(form)
}

describe('real SubmitForm entry and recovery', () => {
  beforeEach(() => {
    jest
      .mocked(recordSubmissionSupport)
      .mockResolvedValue({ success: true, token: 'support-receipt' })
    jest.mocked(preflightSubmission).mockResolvedValue({
      status: 'support_required',
      continuationToken: 'publication-token',
      submissionId: 'sub_123',
      analytics: { reasonCategory: 'passed' }
    })
    jest.mocked(submitLlmsTxt).mockResolvedValue({
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
    global.fetch = jest
      .fn()
      .mockResolvedValue(
        new Response(JSON.stringify({ metadata: SUBMISSION_METADATA }), { status: 200 })
      )
  })

  it('hides all form fields until either profile click has completed', async () => {
    let complete: (value: { success: true; token: string }) => void = () => undefined
    jest.mocked(recordSubmissionSupport).mockImplementationOnce(
      () =>
        new Promise(resolve => {
          complete = resolve
        })
    )
    const user = userEvent.setup()
    render(<SubmitForm />)
    expect(screen.queryByRole('textbox')).not.toBeInTheDocument()
    expect(screen.queryByText(/not verified|self-attestation/i)).not.toBeInTheDocument()
    const profile = screen.getByRole('link', { name: /follow or connect.*linkedin/i })
    expect(profile).toHaveAttribute('target', '_blank')
    expect(profile).toHaveAttribute('href', 'https://www.linkedin.com/in/thedaviddias/')
    await user.click(profile)
    expect(screen.queryByRole('textbox')).not.toBeInTheDocument()
    await act(async () => complete({ success: true, token: 'support-receipt' }))
    expect(await screen.findByLabelText(/website url/i)).toHaveFocus()
  })

  it('retains existing editing tools and submits the receipt without inventing a follow attestation', async () => {
    await enterDetails()
    expect(screen.getByLabelText(/additional content/i)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /use template/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /auto-generate/i })).toBeInTheDocument()
    submitListing()
    expect(await screen.findByRole('link', { name: /view pull request/i })).toBeInTheDocument()
    const fields = jest.mocked(submitLlmsTxt).mock.calls[0]?.[0]
    expect(fields?.get('supportToken')).toBe('support-receipt')
    expect(fields?.get('continuationToken')).toBe('publication-token')
    expect(fields?.has('followAttested')).toBe(false)
    expect(recordSubmissionSupport).toHaveBeenCalledTimes(1)
  })

  it('preserves user edits when a rejected submission returns to details', async () => {
    jest.mocked(preflightSubmission).mockResolvedValueOnce({
      status: 'rejected',
      reasonCode: 'required_resource_missing',
      message: 'Please fix your llms.txt.',
      analytics: { reasonCategory: 'resource' }
    })
    const user = await enterDetails()
    await user.clear(screen.getByLabelText(/^name/i))
    await user.type(screen.getByLabelText(/^name/i), 'My edited name')
    submitListing()
    await screen.findByText('Please fix your llms.txt.')
    await user.click(screen.getByRole('button', { name: /edit details/i }))
    expect(screen.getByLabelText(/^name/i)).toHaveValue('My edited name')
    expect(screen.getByLabelText(/^name/i)).toHaveFocus()
  })

  it('keeps the retry button mounted and retains recovery through temporary state unavailability', async () => {
    jest.mocked(submitLlmsTxt).mockRejectedValueOnce(new Error('Response lost'))
    let complete: (value: Awaited<ReturnType<typeof submitLlmsTxt>>) => void = () => undefined
    jest.mocked(submitLlmsTxt).mockImplementationOnce(
      () =>
        new Promise(resolve => {
          complete = resolve
        })
    )
    const user = await enterDetails()
    submitListing()
    await user.click(await screen.findByRole('button', { name: /retry submission/i }))
    expect(screen.getByRole('button', { name: /retrying/i })).toBeDisabled()
    await act(async () =>
      complete({
        success: false,
        outcome: 'retry_later',
        error: 'Retry to check its status.',
        recovery: 'same_submission',
        analytics: {
          publicationAttempted: false,
          prCreated: false,
          prPresent: false,
          reasonCategory: 'publication'
        }
      })
    )
    await user.click(await screen.findByRole('button', { name: /retry submission/i }))
    await screen.findByRole('link', { name: /view pull request/i })
    expect(preflightSubmission).toHaveBeenCalledTimes(1)
    expect(submitLlmsTxt).toHaveBeenCalledTimes(3)
    for (const [data] of jest.mocked(submitLlmsTxt).mock.calls)
      expect(data.get('continuationToken')).toBe('publication-token')
  })

  it('retries a lost final response with the same continuation instead of creating another preflight', async () => {
    jest.mocked(submitLlmsTxt).mockRejectedValueOnce(new Error('Response lost'))
    const user = await enterDetails()
    submitListing()
    await user.click(await screen.findByRole('button', { name: /retry submission/i }))
    await screen.findByRole('link', { name: /view pull request/i })
    expect(preflightSubmission).toHaveBeenCalledTimes(1)
    expect(submitLlmsTxt).toHaveBeenCalledTimes(2)
    expect(jest.mocked(submitLlmsTxt).mock.calls[1]?.[0].get('continuationToken')).toBe(
      'publication-token'
    )
  })
})
