import { preflightSubmission } from '@/actions/preflight-submission'
import { SubmitForm } from '@/components/forms/submit-form'
import { fireEvent, render, screen, userEvent } from '@/test/test-utils'

/** Stable valid metadata used by submission form transition tests. */
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
  await user.type(screen.getByLabelText(/website url/i), 'https://example.com')
  const metadataForm = screen.getByRole('button', { name: /get website details/i }).closest('form')
  if (!metadataForm) throw new Error('Metadata form was not rendered')
  fireEvent.submit(metadataForm)
  await screen.findByRole('button', { name: /continue to support/i })
  return user
}

/** Submit the currently rendered details form. */
export function submitDetails() {
  const detailsForm = screen.getByRole('button', { name: /continue to support/i }).closest('form')
  if (!detailsForm) throw new Error('Details form was not rendered')
  fireEvent.submit(detailsForm)
}

/** Advance through a successful preflight into the support step. */
export async function reachSubmissionSupport() {
  const user = await reachSubmissionDetails()
  jest.mocked(preflightSubmission).mockResolvedValueOnce({
    analytics: { reasonCategory: 'passed', webRiskAvailable: true },
    continuationToken: 'opaque-token',
    status: 'support_required',
    submissionId: 'sub_123'
  })
  submitDetails()
  await screen.findByRole('heading', { name: /support the maintainer/i })
  return user
}

/** Complete the X support choice and trigger final submission. */
export async function finishSubmissionSupport(user: ReturnType<typeof userEvent.setup>) {
  await user.click(screen.getByRole('radio', { name: 'Follow David on X' }))
  await user.click(screen.getByRole('link', { name: /open david's x profile/i }))
  await user.click(screen.getByRole('checkbox', { name: 'I follow David on this platform' }))
  await user.click(screen.getByRole('button', { name: /finish submission/i }))
}
