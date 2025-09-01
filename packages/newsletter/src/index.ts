// Main exports
export { createNewsletterProvider } from './factory'
export { KitProvider } from './providers/kit'
// Provider classes (if someone wants to use them directly)
export { MailerLiteProvider } from './providers/mailerlite'
export { SubstackProvider } from './providers/substack'

// Types
export type {
  BaseProviderConfig,
  KitConfig,
  MailerLiteConfig,
  NewsletterProvider,
  NewsletterProviderInterface,
  NewsletterSubscriber,
  ProviderConfig,
  SubscribeRequest,
  SubscribeResponse,
  SubstackConfig
} from './types'

// Re-export schema for validation
export { subscribeSchema } from './types'

// Import types for helper functions
import type { NewsletterProviderInterface, ProviderConfig } from './types'

// Helper to check if provider is iframe-only
export function isIframeProvider(provider: NewsletterProviderInterface): boolean {
  return provider.isIframeOnly?.() ?? false
}

// Helper to get provider from environment variables
export function getProviderFromEnv(): ProviderConfig | null {
  // Check for MailerLite
  if (process.env.MAILERLITE_API_KEY) {
    return {
      provider: 'mailerlite',
      apiKey: process.env.MAILERLITE_API_KEY,
      defaultGroupIds: process.env.MAILERLITE_GROUP_IDS?.split(',').map(id => id.trim())
    }
  }

  // Check for Kit (ConvertKit)
  if (process.env.CONVERTKIT_API_KEY && process.env.CONVERTKIT_FORM_ID) {
    return {
      provider: 'kit',
      apiKey: process.env.CONVERTKIT_API_KEY,
      formId: process.env.CONVERTKIT_FORM_ID,
      defaultTagIds: process.env.CONVERTKIT_TAG_IDS?.split(',')
        .map(id => Number(id.trim()))
        .filter(id => !isNaN(id))
    }
  }

  // Check for Substack
  if (process.env.SUBSTACK_PUBLICATION_URL) {
    return {
      provider: 'substack',
      publicationUrl: process.env.SUBSTACK_PUBLICATION_URL,
      embedUrl: process.env.SUBSTACK_EMBED_URL
    }
  }

  return null
}
