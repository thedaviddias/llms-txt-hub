jest.mock('@/actions/record-submission-support', () => ({
  recordSubmissionSupport: jest.fn().mockResolvedValue({ success: true, token: 'support-receipt' })
}))

import { submitLlmsTxt } from '@/actions/submit-llms-xxt'
import { screen } from '@/test/test-utils'
import {
  prepareSubmission,
  reachSubmissionDetails,
  submitPreparedDetails
} from './submit-form-test-helpers'

jest.mock('@/actions/preflight-submission', () => ({ preflightSubmission: jest.fn() }))
jest.mock('@/actions/submit-llms-xxt', () => ({ submitLlmsTxt: jest.fn() }))

describe('SubmitForm return focus', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('focuses the first details field after website metadata loads', async () => {
    await reachSubmissionDetails()

    expect(screen.getByLabelText(/^name/i)).toHaveFocus()
  })

  it('focuses the first details field after returning from a failed submission', async () => {
    const user = await prepareSubmission()

    jest.mocked(submitLlmsTxt).mockRejectedValueOnce(new Error('Response lost'))
    await submitPreparedDetails(user)
    await user.click(await screen.findByRole('button', { name: /edit details/i }))

    expect(screen.getByLabelText(/^name/i)).toHaveFocus()
  })

  it('focuses the website field after submitting another website', async () => {
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
    await screen.findByRole('heading', { name: /submission ready for review/i })

    await user.click(screen.getByRole('button', { name: /submit another/i }))

    expect(screen.getByLabelText(/website url/i)).toHaveFocus()
  })

  it('focuses the website field after resetting details', async () => {
    const user = await reachSubmissionDetails()

    await user.click(screen.getByRole('button', { name: /reset/i }))

    expect(screen.getByLabelText(/website url/i)).toHaveFocus()
  })
})
