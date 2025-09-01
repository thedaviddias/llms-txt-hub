'use client'

import { EmailSubscriptionForm } from './email-subscription-form'

/**
 * Newsletter subscription form component
 * Uses our API backend to support dynamic tag assignment
 *
 * @returns React component that renders a newsletter subscription form
 */
export function NewsletterForm() {
  // Groups/tags are handled server-side through the API
  // The form just collects the email, and the backend adds appropriate groups
  return <EmailSubscriptionForm compact />
}
