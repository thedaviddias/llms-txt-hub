import { submitLlmsTxt } from '@/actions/submit-llms-xxt'
import { screen } from '@/test/test-utils'
import {
  finishSubmissionSupport,
  reachSubmissionDetails,
  reachSubmissionSupport
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

  it('focuses the first details field after returning from support', async () => {
    const user = await reachSubmissionSupport()

    await user.click(screen.getByRole('button', { name: /back to details/i }))

    expect(screen.getByLabelText(/^name/i)).toHaveFocus()
  })

  it('focuses the website field after submitting another website', async () => {
    const user = await reachSubmissionSupport()
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
    await finishSubmissionSupport(user)
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
