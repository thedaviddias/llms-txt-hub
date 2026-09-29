import { preflightSubmission } from '@/actions/preflight-submission'
import { recordSubmissionSupport } from '@/actions/record-submission-support'
import { submitLlmsTxt } from '@/actions/submit-llms-xxt'
import { SubmitForm } from '@/components/forms/submit-form'
import { fireEvent, render, screen, userEvent } from '@/test/test-utils'

/** Realistic metadata supplied at the external API boundary in integration tests. */
export const validSubmissionMetadata = {
  name: 'Example Platform',
  description:
    'A useful developer platform with clear public documentation for teams building software.',
  category: 'developer-tools',
  llmsUrl: 'https://example.com/llms.txt',
  llmsFullUrl: ''
}

/** Configure external boundaries while keeping the complete production form mounted. */
export function configureSubmissionMocks() {
  jest.mocked(recordSubmissionSupport).mockReset().mockResolvedValue({ success: true })
  jest
    .mocked(preflightSubmission)
    .mockReset()
    .mockResolvedValue({
      status: 'support_required',
      continuationToken: 'continuation-token',
      submissionId: 'sub_fixture',
      analytics: { reasonCategory: 'passed' }
    })
  jest
    .mocked(submitLlmsTxt)
    .mockReset()
    .mockResolvedValue({
      success: true,
      outcome: 'manual',
      prUrl: 'https://github.com/thedaviddias/llms-txt-hub/pull/123',
      analytics: {
        reasonCategory: 'passed',
        publicationAttempted: true,
        prCreated: true,
        prPresent: true
      }
    })
  global.fetch = jest.fn(
    async input =>
      new Response(
        JSON.stringify(
          String(input).includes('check-url')
            ? { accessible: true }
            : { metadata: validSubmissionMetadata }
        ),
        { status: 200 }
      )
  )
}

/** Exercise the support entry and website intake using production components. */
export async function renderRealSubmissionDetails() {
  const user = userEvent.setup()
  render(<SubmitForm />)
  await user.click(screen.getByRole('link', { name: /follow david on x/i }))
  await user.type(await screen.findByLabelText(/website url/i), 'https://example.com')
  const form = screen.getByRole('button', { name: /get website details/i }).closest('form')
  if (!form) throw new Error('Website intake form missing')
  fireEvent.submit(form)
  await screen.findByLabelText(/^name/i)
  return user
}

/** Submit the actual details form through its resolver and preflight coordinator. */
export function submitRealListing() {
  const form = screen.getByRole('button', { name: /^submit listing$/i }).closest('form')
  if (!form) throw new Error('Submission details form missing')
  fireEvent.submit(form)
}
