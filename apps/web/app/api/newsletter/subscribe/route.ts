import { validateCSRFToken } from '@/lib/csrf-protection'
import * as Sentry from '@sentry/nextjs'
import { logger } from '@thedaviddias/logging'
import {
  createNewsletterProvider,
  getProviderFromEnv,
  subscribeSchema
} from '@thedaviddias/newsletter'
import { type NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'

// Get provider configuration from environment
const providerConfig = getProviderFromEnv()

// Add logger to config if we have one
if (providerConfig) {
  providerConfig.logger = logger
}

const provider = providerConfig ? createNewsletterProvider(providerConfig) : null

export async function POST(request: NextRequest) {
  try {
    // Debug logging
    logger.debug('Newsletter API called', {
      data: { hasProvider: !!provider, provider: providerConfig?.provider },
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

    if (!provider) {
      logger.error('Newsletter provider is not configured. Check your environment variables.')
      Sentry.captureMessage('Newsletter provider not configured', 'warning')
      return NextResponse.json({ error: 'Newsletter service is not configured' }, { status: 500 })
    }

    const body = await request.json()
    const data = subscribeSchema.parse(body)

    // Use the provider to subscribe
    const result = await provider.subscribe(data)

    if (!result.success) {
      // Special handling for unsubscribed users (MailerLite specific)
      if (result.error === 'EMAIL_UNSUBSCRIBED') {
        return NextResponse.json(
          {
            error: result.message,
            code: 'EMAIL_UNSUBSCRIBED'
          },
          { status: 422 }
        )
      }

      // For iframe-only providers like Substack
      if (result.error === 'IFRAME_ONLY') {
        return NextResponse.json(
          {
            error: result.message,
            code: 'IFRAME_ONLY'
          },
          { status: 501 } // Not Implemented
        )
      }

      return NextResponse.json(
        {
          error: result.message || 'Failed to subscribe to newsletter'
        },
        { status: 400 }
      )
    }

    return NextResponse.json({
      success: true,
      message: result.message,
      subscriber: result.subscriber
        ? {
            id: result.subscriber.id,
            email: result.subscriber.email,
            status: result.subscriber.status
          }
        : undefined
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
          operation: 'newsletter_subscription',
          provider: providerConfig?.provider
        },
        extra: {
          hasProvider: !!provider,
          provider: providerConfig?.provider
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
    provider: providerConfig?.provider || 'not configured',
    methods: ['POST']
  })
}
