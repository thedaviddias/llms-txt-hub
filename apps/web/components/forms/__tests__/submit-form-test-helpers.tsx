import { preflightSubmission } from '@/actions/preflight-submission'
import { SubmitForm } from '@/components/forms/submit-form'
import { fireEvent, render, screen, userEvent, waitFor } from '@/test/test-utils'

jest.mock('@/actions/record-submission-support', () => ({
  recordSubmissionSupport: jest.fn().mockResolvedValue({ success: true })
}))

/**

 * Open the initial gate through the same profile action as the real UI.

 */
export async function unlockSubmissionForm(user = userEvent.setup()) {
  await user.click(screen.getByRole('link', { name: /follow david on x/i }))
  await screen.findByLabelText(/website url/i)
  return user
}

/**

 * Stable valid metadata used by submission form transition tests.

 */
export const SUBMISSION_METADATA = {
  category: 'developer-tools',
  description:
    'Example provides documentation and tools for developers building reliable applications.',
  llmsFullUrl: '',
  llmsUrl: 'https://example.com/llms.txt',
  name: 'Example'
}

/**
 * Render the form and advance through metadata collection.
 */
export async function reachSubmissionDetails() {
  const user = userEvent.setup()
  global.fetch = jest.fn().mockResolvedValueOnce(
    new Response(JSON.stringify({ isDuplicate: false, metadata: SUBMISSION_METADATA }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    })
  )
  render(<SubmitForm />)
  await unlockSubmissionForm(user)
  await user.type(screen.getByLabelText(/website url/i), 'https://example.com')
  const metadataForm = screen.getByRole('button', { name: /get website details/i }).closest('form')
  if (!metadataForm) throw new Error('Metadata form was not rendered')
  fireEvent.submit(metadataForm)
  await screen.findByRole('button', { name: /submit listing/i })
  return user
}

/**

 * Submit the currently rendered details form.

 */
export function submitDetails() {
  const detailsForm = screen.getByRole('button', { name: /submit listing/i }).closest('form')
  if (!detailsForm) throw new Error('Details form was not rendered')
  fireEvent.submit(detailsForm)
}

/**

 * Prepare a successful preflight response for the complete submission action.

 */
export async function prepareSubmission() {
  const user = await reachSubmissionDetails()
  jest
    .mocked(preflightSubmission)
    .mockReset()
    .mockResolvedValue({
      analytics: { reasonCategory: 'passed', webRiskAvailable: true },
      continuationToken: 'opaque-token',
      status: 'support_required',
      submissionId: 'sub_123'
    })
  return user
}

/**

 * Submit the prepared details through preflight and final publication.

 */
export async function submitPreparedDetails(_user: ReturnType<typeof userEvent.setup>) {
  submitDetails()
  await waitFor(() => expect(preflightSubmission).toHaveBeenCalled())
}
