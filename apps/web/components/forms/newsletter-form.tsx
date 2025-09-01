'use client'

import { EmailSubscriptionForm } from './email-subscription-form'

/**
 * Newsletter subscription form component
 * Uses our API backend to support dynamic tag assignment
 *
 * @returns React component that renders a newsletter subscription form
 */
export function NewsletterForm() {
  return (
    <EmailSubscriptionForm
      compact
      defaultGroups={process.env.NEXT_PUBLIC_NEWSLETTER_GROUP_IDS?.split(',') || []}
    />
  )
}
