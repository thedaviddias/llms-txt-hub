import type {
  KitConfig,
  NewsletterProviderInterface,
  NewsletterSubscriber,
  SubscribeRequest,
  SubscribeResponse
} from '../types'

const API_BASE = 'https://api.convertkit.com/v4'

export class KitProvider implements NewsletterProviderInterface {
  private config: KitConfig

  constructor(config: KitConfig) {
    this.config = config

    if (!config.apiKey) {
      throw new Error('Kit (ConvertKit) API key is required')
    }
    if (!config.formId) {
      throw new Error('Kit (ConvertKit) form ID is required')
    }
  }

  async subscribe(data: SubscribeRequest): Promise<SubscribeResponse> {
    try {
      this.config.logger?.debug('Kit: Creating subscriber', {
        data: { email: data.email, tagsCount: data.groups?.length },
        tags: { type: 'newsletter' }
      })

      const requestBody: any = {
        email_address: data.email
      }

      // Convert groups to tags for Kit (groups in our API = tags in Kit)
      // Groups/tags are passed per-request since each project may have different ones
      // Only use default tags as fallback if no groups provided
      const tags =
        data.groups?.map(tag => Number(tag)).filter(tag => !isNaN(tag)) || this.config.defaultTagIds
      if (tags && tags.length > 0) {
        requestBody.tags = tags
      }

      // Subscribe to the form (v4 API)
      const response = await fetch(`${API_BASE}/forms/${this.config.formId}/subscribers`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Accept: 'application/json',
          Authorization: `Bearer ${this.config.apiKey}`
        },
        body: JSON.stringify(requestBody)
      })

      if (!response.ok) {
        const errorText = await response.text()

        // Handle specific Kit errors
        if (response.status === 400) {
          try {
            const errorData = JSON.parse(errorText)
            if (errorData.error?.includes('already subscribed')) {
              return {
                success: true, // Kit considers this a success
                message: 'Already subscribed to newsletter',
                subscriber: {
                  id: 'existing',
                  email: data.email,
                  status: 'active',
                  createdAt: new Date().toISOString()
                }
              }
            }
          } catch (parseError) {
            // If we can't parse the error, fall back to generic message
          }
        }

        throw new Error(`Failed to create subscriber: ${response.status} - ${errorText}`)
      }

      const result = await response.json()

      // Map Kit v4 response to our common format
      const subscriber: NewsletterSubscriber = {
        id: result.subscriber?.id || result.id || 'unknown',
        email: result.subscriber?.email_address || data.email,
        status: result.subscriber?.state || 'active',
        createdAt: result.subscriber?.created_at || new Date().toISOString()
      }

      return {
        success: true,
        message: 'Successfully subscribed to newsletter',
        subscriber
      }
    } catch (error) {
      this.config.logger?.error('Kit subscription error', {
        data: error,
        tags: { provider: 'kit' }
      })

      return {
        success: false,
        message: 'Failed to subscribe to newsletter',
        error: error instanceof Error ? error.message : 'Unknown error'
      }
    }
  }

  async unsubscribe(email: string): Promise<{ success: boolean; message: string }> {
    try {
      // First, get the subscriber to get their ID
      const searchResponse = await fetch(
        `${API_BASE}/subscribers?email_address=${encodeURIComponent(email)}`,
        {
          method: 'GET',
          headers: {
            Accept: 'application/json',
            Authorization: `Bearer ${this.config.apiKey}`
          }
        }
      )

      if (!searchResponse.ok) {
        throw new Error('Failed to find subscriber')
      }

      const searchResult = await searchResponse.json()
      const subscriber = searchResult.subscribers?.[0]

      if (!subscriber) {
        return {
          success: false,
          message: 'Subscriber not found'
        }
      }

      // Kit v4 API - unsubscribe the subscriber
      const response = await fetch(`${API_BASE}/subscribers/${subscriber.id}/unsubscribe`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Accept: 'application/json',
          Authorization: `Bearer ${this.config.apiKey}`
        }
      })

      if (!response.ok) {
        const errorText = await response.text()
        throw new Error(`Failed to unsubscribe: ${errorText}`)
      }

      return {
        success: true,
        message: 'Successfully unsubscribed'
      }
    } catch (error) {
      this.config.logger?.error('Kit unsubscribe error', {
        data: error,
        tags: { provider: 'kit' }
      })

      return {
        success: false,
        message: error instanceof Error ? error.message : 'Failed to unsubscribe'
      }
    }
  }

  async getSubscriber(email: string): Promise<NewsletterSubscriber | null> {
    try {
      // Kit v4 API - search for subscriber
      const response = await fetch(
        `${API_BASE}/subscribers?email_address=${encodeURIComponent(email)}`,
        {
          method: 'GET',
          headers: {
            Accept: 'application/json',
            Authorization: `Bearer ${this.config.apiKey}`
          }
        }
      )

      if (!response.ok) {
        return null
      }

      const result = await response.json()
      const subscriber = result.subscribers?.[0]

      if (!subscriber) {
        return null
      }

      return {
        id: subscriber.id,
        email: subscriber.email_address,
        status: subscriber.state,
        createdAt: subscriber.created_at
      }
    } catch (error) {
      this.config.logger?.error('Kit get subscriber error', {
        data: error,
        tags: { provider: 'kit' }
      })
      return null
    }
  }
}
