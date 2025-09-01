import type {
  NewsletterProviderInterface,
  NewsletterSubscriber,
  SubscribeRequest,
  SubscribeResponse,
  SubstackConfig
} from '../types'

export class SubstackProvider implements NewsletterProviderInterface {
  private config: SubstackConfig

  constructor(config: SubstackConfig) {
    this.config = config

    if (!config.publicationUrl) {
      throw new Error('Substack publication URL is required')
    }
  }

  async subscribe(_data: SubscribeRequest): Promise<SubscribeResponse> {
    // Substack doesn't have an API - it uses an embedded iframe
    // This provider is mainly for configuration and generating the embed URL
    this.config.logger?.warn('Substack uses iframe embedding, not API calls', {
      tags: { type: 'newsletter' }
    })

    return {
      success: false,
      message: 'Substack requires iframe embedding. Use getEmbedUrl() to get the iframe source.',
      error: 'IFRAME_ONLY'
    }
  }

  /**
   * Get the Substack embed URL for iframe integration
   */
  getEmbedUrl(): string {
    const publicationDomain = this.config.publicationUrl
      .replace(/^https?:\/\//, '')
      .replace(/\/$/, '')
    return this.config.embedUrl || `https://${publicationDomain}/embed`
  }

  /**
   * Indicates this provider only works with iframe embedding
   */
  isIframeOnly(): boolean {
    return true
  }

  async unsubscribe(_email: string): Promise<{ success: boolean; message: string }> {
    // Substack doesn't provide a public API for unsubscribing
    // Users must use the unsubscribe link in their emails
    return {
      success: false,
      message: 'Please use the unsubscribe link in your Substack emails to unsubscribe'
    }
  }

  async getSubscriber(_email: string): Promise<NewsletterSubscriber | null> {
    // Substack doesn't provide a public API for getting subscriber info
    this.config.logger?.warn('Substack does not provide API for getting subscriber info', {
      tags: { type: 'newsletter' }
    })
    return null
  }
}
