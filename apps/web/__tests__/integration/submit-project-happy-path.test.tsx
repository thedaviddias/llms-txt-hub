import {
  configureSubmissionMocks,
  renderRealSubmissionDetails,
  submitRealListing
} from '@/__tests__/utils/real-submission-helpers'
import { preflightSubmission } from '@/actions/preflight-submission'
import { submitLlmsTxt } from '@/actions/submit-llms-xxt'
import { screen, waitFor } from '@/test/test-utils'

jest.unmock('react-markdown')

jest.mock('@/actions/record-submission-support', () => ({ recordSubmissionSupport: jest.fn() }))
jest.mock('@/actions/preflight-submission', () => ({ preflightSubmission: jest.fn() }))
jest.mock('@/actions/submit-llms-xxt', () => ({ submitLlmsTxt: jest.fn() }))

describe('production submission form integration', () => {
  beforeEach(configureSubmissionMocks)

  it('preserves additional content tools and optional URL through the complete form payload', async () => {
    const user = await renderRealSubmissionDetails()
    await user.click(screen.getByRole('button', { name: /use template/i }))
    const content = screen.getByLabelText(/additional content/i)
    if (!(content instanceof HTMLTextAreaElement))
      throw new Error('Additional content textarea missing')
    expect(content.value).toContain('## Key Focus Areas')
    await user.click(screen.getByRole('button', { name: /^preview$/i }))
    expect(screen.getByRole('heading', { name: 'Key Focus Areas' })).toBeInTheDocument()
    expect(screen.getByText('AI Integration').tagName).toBe('STRONG')
    expect(screen.getByText('AI Integration').closest('li')).not.toBeNull()
    await user.click(screen.getByRole('button', { name: /^edit$/i }))
    await user.click(screen.getByRole('button', { name: /auto-generate/i }))
    expect(screen.getByLabelText(/llms-full.txt url/i)).toHaveValue(
      'https://example.com/llms-full.txt'
    )
    submitRealListing()
    expect(await screen.findByRole('link', { name: /view pull request/i })).toHaveAttribute(
      'href',
      'https://github.com/thedaviddias/llms-txt-hub/pull/123'
    )
    const data = jest.mocked(submitLlmsTxt).mock.calls[0]?.[0]
    expect(data?.get('mdxContent')).toContain('## Key Focus Areas')
    expect(data?.get('llmsFullUrl')).toBe('https://example.com/llms-full.txt')
    expect(data?.get('supportToken')).toBe('support-receipt')
    expect(data?.has('followAttested')).toBe(false)
  })

  it('publishes edited autofill values and supports another submission', async () => {
    const user = await renderRealSubmissionDetails()
    await user.clear(screen.getByLabelText(/^name/i))
    await user.type(screen.getByLabelText(/^name/i), 'Updated Platform')
    submitRealListing()
    await screen.findByRole('link', { name: /view pull request/i })
    expect(jest.mocked(preflightSubmission).mock.calls[0]?.[0].get('name')).toBe('Updated Platform')
    await user.click(screen.getByRole('button', { name: /submit another/i }))
    expect(screen.getByLabelText(/website url/i)).toHaveValue('')
    expect(screen.getByLabelText(/website url/i)).toHaveFocus()
  })

  it('submits successfully without optional content or full URL', async () => {
    await renderRealSubmissionDetails()
    submitRealListing()
    await waitFor(() => expect(submitLlmsTxt).toHaveBeenCalledTimes(1))
    const data = jest.mocked(submitLlmsTxt).mock.calls[0]?.[0]
    expect(data?.has('mdxContent')).toBe(false)
    expect(data?.has('llmsFullUrl')).toBe(false)
  })
})
