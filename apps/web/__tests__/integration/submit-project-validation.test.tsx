import {
  configureSubmissionMocks,
  renderRealSubmissionDetails,
  submitRealListing
} from '@/__tests__/utils/real-submission-helpers'
import { preflightSubmission } from '@/actions/preflight-submission'
import { submitLlmsTxt } from '@/actions/submit-llms-xxt'
import { screen } from '@/test/test-utils'

jest.unmock('react-markdown')

jest.mock('@/actions/record-submission-support', () => ({ recordSubmissionSupport: jest.fn() }))
jest.mock('@/actions/preflight-submission', () => ({ preflightSubmission: jest.fn() }))
jest.mock('@/actions/submit-llms-xxt', () => ({ submitLlmsTxt: jest.fn() }))

describe('production submission validation and recovery', () => {
  beforeEach(configureSubmissionMocks)

  it('blocks invalid required fields before calling the preflight action', async () => {
    const user = await renderRealSubmissionDetails()
    await user.clear(screen.getByLabelText(/^name/i))
    await user.clear(screen.getByLabelText(/^description/i))
    submitRealListing()
    expect(await screen.findByText('Name must be at least 2 characters.')).toBeInTheDocument()
    expect(screen.getByText(/Description must be at least 50/)).toBeInTheDocument()
    expect(preflightSubmission).not.toHaveBeenCalled()
  })

  it('allows manual completion when metadata fetching fails', async () => {
    global.fetch = jest
      .fn()
      .mockResolvedValue(
        new Response(JSON.stringify({ error: 'Website metadata is unavailable.' }), { status: 400 })
      )
    const user = await renderRealSubmissionDetails()
    expect(screen.getByText('Could not fetch website information')).toBeInTheDocument()
    await user.type(screen.getByLabelText(/^name/i), 'Manual Platform')
    expect(screen.getByLabelText(/^name/i)).toHaveValue('Manual Platform')
    expect(screen.getByLabelText(/^website url/i)).toHaveValue('https://example.com')
  })

  it('keeps edits available after a duplicate rejection', async () => {
    jest.mocked(preflightSubmission).mockResolvedValueOnce({
      status: 'rejected',
      message: 'This website already has a listing.',
      reasonCode: 'duplicate',
      analytics: { reasonCategory: 'duplicate' }
    })
    const user = await renderRealSubmissionDetails()
    await user.type(screen.getByLabelText(/additional content/i), 'Keep this draft.')
    submitRealListing()
    await screen.findByText('This website already has a listing.')
    await user.click(screen.getByRole('button', { name: /edit details/i }))
    expect(screen.getByLabelText(/additional content/i)).toHaveValue('Keep this draft.')
    expect(submitLlmsTxt).not.toHaveBeenCalled()
  })

  it('preserves the exact continuation after a lost final response', async () => {
    jest.mocked(submitLlmsTxt).mockRejectedValueOnce(new Error('Response lost'))
    const user = await renderRealSubmissionDetails()
    submitRealListing()
    await user.click(await screen.findByRole('button', { name: /retry submission/i }))
    await screen.findByRole('link', { name: /view pull request/i })
    expect(preflightSubmission).toHaveBeenCalledTimes(1)
    expect(jest.mocked(submitLlmsTxt).mock.calls[1]?.[0].get('continuationToken')).toBe(
      'continuation-token'
    )
  })
})
