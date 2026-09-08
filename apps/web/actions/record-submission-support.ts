'use server'

import { auth } from '@thedaviddias/auth'
import { logger } from '@thedaviddias/logging'
import { getStoredCSRFToken } from '@/lib/csrf-protection'
import { isValidSubmissionCsrf } from '@/lib/submissions/submission-action-input'
import { createSupportReceipt } from '@/lib/submissions/submission-support'

type SupportResult = { success: true; token: string } | { success: false; error: string }

/**

 * Record an authenticated profile click before allowing the submission form to continue.

 */
export async function recordSubmissionSupport(formData: FormData): Promise<SupportResult> {
  try {
    const session = await auth()
    if (!session?.user?.id)
      return { success: false, error: 'Please sign in to submit your website.' }
    const csrf = await getStoredCSRFToken()
    if (!isValidSubmissionCsrf(formData.get('_csrf'), csrf?.token)) {
      return { success: false, error: 'Refresh the page and open your preferred profile again.' }
    }
    const platform = formData.get('supportPlatform')
    if (platform !== 'x' && platform !== 'linkedin') {
      return { success: false, error: 'Choose LinkedIn or X to continue.' }
    }
    const token = createSupportReceipt(platform, session.user.id)
    if (token) return { success: true, token }
  } catch {
    logger.error('Submission support unavailable', { tags: { operation: 'submission_support' } })
  }
  return { success: false, error: 'We could not open the submission form. Please try again.' }
}
