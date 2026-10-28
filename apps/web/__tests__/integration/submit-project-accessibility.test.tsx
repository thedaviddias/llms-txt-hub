import {
  configureSubmissionMocks,
  renderRealSubmissionDetails,
  submitRealListing
} from '@/__tests__/utils/real-submission-helpers'
import { screen } from '@/test/test-utils'

jest.unmock('react-markdown')

jest.mock('@/actions/record-submission-support', () => ({ recordSubmissionSupport: jest.fn() }))
jest.mock('@/actions/preflight-submission', () => ({ preflightSubmission: jest.fn() }))
jest.mock('@/actions/submit-llms-xxt', () => ({ submitLlmsTxt: jest.fn() }))

describe('production submission accessibility', () => {
  beforeEach(configureSubmissionMocks)

  it('associates the actual editable fields with their labels and focuses details', async () => {
    await renderRealSubmissionDetails()
    for (const label of [
      /^name/i,
      /^description/i,
      /^website url/i,
      /^llms.txt url/i,
      /^llms-full.txt url/i,
      /additional content/i
    ]) {
      expect(screen.getByLabelText(label)).toBeInTheDocument()
    }
    expect(screen.getByRole('combobox')).toHaveAccessibleName(/category/i)
    expect(screen.getByLabelText(/^name/i)).toHaveFocus()
  })

  it('associates validation messages with invalid inputs', async () => {
    const user = await renderRealSubmissionDetails()
    const input = screen.getByLabelText(/^name/i)
    await user.clear(input)
    submitRealListing()
    const error = await screen.findByText('Name must be at least 2 characters.')
    expect(input).toHaveAttribute('aria-invalid', 'true')
    expect(input.getAttribute('aria-describedby')).toContain(error.id)
  })

  it('focuses the result after submission and offers one interactive PR link', async () => {
    await renderRealSubmissionDetails()
    submitRealListing()
    expect(
      await screen.findByRole('heading', { name: 'Submission ready for review' })
    ).toHaveFocus()
    expect(screen.getByRole('link', { name: /view pull request/i })).not.toHaveAttribute(
      'role',
      'button'
    )
    expect(screen.getByRole('link', { name: /back to home/i })).toHaveAttribute('href', '/')
  })
})
