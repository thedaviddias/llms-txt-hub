import { z } from 'zod'

// Common validation schemas - matching exactly what's in apps/web
export const subscribeSchema = z.object({
  email: z.string().email('Invalid email address'),
  groups: z.array(z.string()).optional()
})

export type SubscribeRequest = z.infer<typeof subscribeSchema>

// Common response format
export interface NewsletterSubscriber {
  id: string | number
  email: string
  status: string
  createdAt: string
  updatedAt?: string
  groups?: string[]
}

export interface SubscribeResponse {
  success: boolean
  message: string
  subscriber?: NewsletterSubscriber
  error?: string
}

// Provider configuration
export type NewsletterProvider = 'mailerlite' | 'kit' | 'substack'

export interface BaseProviderConfig {
  provider: NewsletterProvider
  apiKey?: string
  logger?: {
    debug: (message: string, options?: any) => void
    warn: (message: string, options?: any) => void
    error: (message: string, options?: any) => void
  }
}

export interface MailerLiteConfig extends BaseProviderConfig {
  provider: 'mailerlite'
  apiKey: string
  // Optional: fallback groups if none provided in request
  defaultGroupIds?: string[]
}

export interface KitConfig extends BaseProviderConfig {
  provider: 'kit'
  apiKey: string
  formId: string
  // Optional: fallback tags if none provided in request
  defaultTagIds?: number[]
}

export interface SubstackConfig extends BaseProviderConfig {
  provider: 'substack'
  publicationUrl: string
  embedUrl?: string
}

export type ProviderConfig = MailerLiteConfig | KitConfig | SubstackConfig

// Provider interface
export interface NewsletterProviderInterface {
  subscribe(data: SubscribeRequest): Promise<SubscribeResponse>
  unsubscribe?(email: string): Promise<{ success: boolean; message: string }>
  getSubscriber?(email: string): Promise<NewsletterSubscriber | null>
  // For iframe-based providers like Substack
  getEmbedUrl?(): string
  isIframeOnly?(): boolean
}
