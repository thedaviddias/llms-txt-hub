import { type NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import * as Sentry from '@sentry/nextjs'
import { logger } from '@thedaviddias/logging'
import { validateCSRFToken } from '@/lib/csrf-protection'

// Validation schema for newsletter subscription
const subscribeSchema = z.object({
  email: z.string().email('Invalid email address'),
  groups: z.array(z.string()).optional()
})

type SubscribeRequest = z.infer<typeof subscribeSchema>

// Newsletter service configuration
const NEWSLETTER_API_KEY = process.env.NEWSLETTER_API_KEY
const NEWSLETTER_GROUP_IDS = process.env.NEWSLETTER_GROUP_IDS?.split(',').map(id => id.trim()) || []

// API configuration
const API_BASE = 'https://connect.mailerlite.com/api'

if (!NEWSLETTER_API_KEY) {
  logger.warn('Newsletter API key is not set. Newsletter subscription will not work.')
}

interface NewsletterSubscriber {
  id: number
  email_address: string
  first_name?: string
  last_name?: string
  state: string
  created_at: string
  updated_at: string
}

/**
 * Create or update a subscriber in the newsletter service
 */
async function createSubscriber(data: SubscribeRequest): Promise<NewsletterSubscriber> {
  logger.debug('Creating subscriber', { 
    data: { email: data.email, groupCount: data.groups?.length },
    tags: { type: 'newsletter' }
  })

  const requestBody: any = {
    email: data.email,
    fields: {}
  }

  // Add groups if provided (these should be group IDs)
  if (data.groups && data.groups.length > 0) {
    requestBody.groups = data.groups
  }

  const response = await fetch(`${API_BASE}/subscribers`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Accept: 'application/json',
      Authorization: `Bearer ${NEWSLETTER_API_KEY}`
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
          throw new Error(
            'This email was previously unsubscribed. Please use a different email or contact support to reactivate your subscription.'
          )
        }
      } catch (parseError) {
        // If we can't parse the error, fall back to generic message
      }
    }

    throw new Error(`Failed to create subscriber: ${response.status} - ${errorText}`)
  }

  const result = await response.json()

  // Map MailerLite response to our common format
  return {
    id: result.data?.id || 0,
    email_address: result.data?.email || data.email,
    first_name: result.data?.fields?.name,
    last_name: result.data?.fields?.last_name,
    state: result.data?.status || 'active',
    created_at: result.data?.created_at || new Date().toISOString(),
    updated_at: result.data?.updated_at || new Date().toISOString()
  }
}

export async function POST(request: NextRequest) {
  try {
    // Debug logging
    logger.debug('Newsletter API called', { 
      data: { hasApiKey: !!NEWSLETTER_API_KEY },
      tags: { type: 'newsletter' }
    })

    // Validate CSRF token using the existing protection system
    const isValidCSRF = await validateCSRFToken(request)

    if (!isValidCSRF) {
      return NextResponse.json(
        {
          error: 'Invalid or missing CSRF token',
          code: 'CSRF_VALIDATION_FAILED'
        },
        { status: 403 }
      )
    }

    if (!NEWSLETTER_API_KEY) {
      logger.error('NEWSLETTER_API_KEY is not configured. Check your environment variables.')
      Sentry.captureMessage('Newsletter API key not configured', 'warning')
      return NextResponse.json({ error: 'Newsletter service is not configured' }, { status: 500 })
    }

    const body = await request.json()
    const data = subscribeSchema.parse(body)

    // If default groups are configured and no groups were provided, use defaults
    if (NEWSLETTER_GROUP_IDS.length > 0 && (!data.groups || data.groups.length === 0)) {
      data.groups = NEWSLETTER_GROUP_IDS
    }

    // Create the subscriber
    const subscriber = await createSubscriber(data)

    return NextResponse.json({
      success: true,
      message: 'Successfully subscribed to newsletter',
      subscriber: {
        id: subscriber.id,
        email: subscriber.email_address,
        status: subscriber.state
      }
    })
  } catch (error) {
    logger.error('Newsletter subscription error', { 
      data: error,
      tags: { type: 'newsletter' }
    })
    
    // Capture error in Sentry with context
    if (error instanceof Error) {
      Sentry.captureException(error, {
        tags: {
          operation: 'newsletter_subscription'
        },
        extra: {
          hasApiKey: !!NEWSLETTER_API_KEY,
          groupIds: NEWSLETTER_GROUP_IDS
        }
      })
    }

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        {
          error: 'Invalid request data',
          details: error.errors
        },
        { status: 400 }
      )
    }

    // Return more detailed error in development
    const isDevelopment = process.env.NODE_ENV === 'development'

    return NextResponse.json(
      {
        error: 'Failed to subscribe to newsletter',
        ...(isDevelopment &&
          error instanceof Error && {
            debug: {
              message: error.message,
              type: error.name
            }
          })
      },
      { status: 500 }
    )
  }
}

export async function GET() {
  return NextResponse.json({
    message: 'Newsletter subscription endpoint',
    methods: ['POST']
  })
}
