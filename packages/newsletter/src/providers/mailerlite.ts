import type {
  MailerLiteConfig,
  NewsletterProviderInterface,
  NewsletterSubscriber,
  SubscribeRequest,
  SubscribeResponse
} from '../types'

const API_BASE = 'https://connect.mailerlite.com/api'

export class MailerLiteProvider implements NewsletterProviderInterface {
  private config: MailerLiteConfig

  constructor(config: MailerLiteConfig) {
    this.config = config

    if (!config.apiKey) {
      throw new Error('MailerLite API key is required')
    }
  }

  async subscribe(data: SubscribeRequest): Promise<SubscribeResponse> {
    try {
      this.config.logger?.debug('Creating subscriber', {
        data: { email: data.email, groupCount: data.groups?.length },
        tags: { type: 'newsletter' }
      })

      const requestBody: any = {
        email: data.email,
        fields: {}
      }

      // Add groups if provided in the request (these should be group IDs)
      // Groups are passed per-request since each project may have different groups
      // Only use default groups as fallback if no groups provided
      const groups =
        data.groups && data.groups.length > 0 ? data.groups : this.config.defaultGroupIds
      if (groups && groups.length > 0) {
        requestBody.groups = groups
      }

      const response = await fetch(`${API_BASE}/subscribers`, {
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

        // Handle specific MailerLite errors
        if (response.status === 422) {
          try {
            const errorData = JSON.parse(errorText)
            if (errorData.errors?.email?.[0]?.includes('unsubscribed')) {
              return {
                success: false,
                message:
                  'This email was previously unsubscribed. Please use a different email or contact support to reactivate your subscription.',
                error: 'EMAIL_UNSUBSCRIBED'
              }
            }
          } catch (parseError) {
            // If we can't parse the error, fall back to generic message
          }
        }

        throw new Error(`Failed to create subscriber: ${response.status} - ${errorText}`)
      }

      const result = await response.json()

      // Map MailerLite response to our common format (matching existing implementation)
      const subscriber: NewsletterSubscriber = {
        id: result.data?.id || 0,
        email: result.data?.email || data.email,
        status: result.data?.status || 'active',
        createdAt: result.data?.created_at || new Date().toISOString(),
        updatedAt: result.data?.updated_at || new Date().toISOString()
      }

      return {
        success: true,
        message: 'Successfully subscribed to newsletter',
        subscriber
      }
    } catch (error) {
      this.config.logger?.error('Newsletter subscription error', {
        data: error,
        tags: { type: 'newsletter' }
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
      // First, get the subscriber ID
      const searchResponse = await fetch(
        `${API_BASE}/subscribers?filter[email]=${encodeURIComponent(email)}`,
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
      const subscriber = searchResult.data?.[0]

      if (!subscriber) {
        return {
          success: false,
          message: 'Subscriber not found'
        }
      }

      // Update subscriber status to unsubscribed
      const response = await fetch(`${API_BASE}/subscribers/${subscriber.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Accept: 'application/json',
          Authorization: `Bearer ${this.config.apiKey}`
        },
        body: JSON.stringify({
          status: 'unsubscribed'
        })
      })

      if (!response.ok) {
        throw new Error('Failed to unsubscribe')
      }

      return {
        success: true,
        message: 'Successfully unsubscribed'
      }
    } catch (error) {
      this.config.logger?.error('Newsletter unsubscribe error', {
        data: error,
        tags: { type: 'newsletter' }
      })

      return {
        success: false,
        message: error instanceof Error ? error.message : 'Failed to unsubscribe'
      }
    }
  }

  async getSubscriber(email: string): Promise<NewsletterSubscriber | null> {
    try {
      const response = await fetch(
        `${API_BASE}/subscribers?filter[email]=${encodeURIComponent(email)}`,
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
      const subscriber = result.data?.[0]

      if (!subscriber) {
        return null
      }

      return {
        id: subscriber.id,
        email: subscriber.email,
        status: subscriber.status,
        createdAt: subscriber.created_at,
        updatedAt: subscriber.updated_at
      }
    } catch (error) {
      this.config.logger?.error('Newsletter get subscriber error', {
        data: error,
        tags: { type: 'newsletter' }
      })
      return null
    }
  }
}
