import { KitProvider } from './providers/kit'
import { MailerLiteProvider } from './providers/mailerlite'
import { SubstackProvider } from './providers/substack'
import type { NewsletterProviderInterface, ProviderConfig } from './types'

export function createNewsletterProvider(config: ProviderConfig): NewsletterProviderInterface {
  switch (config.provider) {
    case 'mailerlite':
      return new MailerLiteProvider(config)
    case 'kit':
      return new KitProvider(config)
    case 'substack':
      return new SubstackProvider(config)
    default:
      throw new Error(`Unsupported newsletter provider: ${(config as any).provider}`)
  }
}
