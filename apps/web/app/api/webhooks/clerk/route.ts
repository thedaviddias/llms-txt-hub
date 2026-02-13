import { logger } from '@thedaviddias/logging'
import { NextResponse } from 'next/server'
import { invalidateMembersCache } from '@/lib/member-server-utils'

const WEBHOOK_SECRET = process.env.CLERK_WEBHOOK_SECRET

/**
 * Verify Clerk webhook signature using Svix headers and Web Crypto API.
 * Clerk uses Svix under the hood — the signature is an HMAC-SHA256 of
 * `${svix-id}.${svix-timestamp}.${body}` signed with the webhook secret.
 */
async function verifyWebhookSignature(body: string, headers: Headers): Promise<boolean> {
  if (!WEBHOOK_SECRET) {
    logger.warn('CLERK_WEBHOOK_SECRET not configured — skipping verification in development')
    return process.env.NODE_ENV === 'development'
  }

  const svixId = headers.get('svix-id')
  const svixTimestamp = headers.get('svix-timestamp')
  const svixSignature = headers.get('svix-signature')

  if (!svixId || !svixTimestamp || !svixSignature) {
    return false
  }

  // Reject timestamps older than 5 minutes to prevent replay attacks
  const timestampSeconds = Number(svixTimestamp)
  const now = Math.floor(Date.now() / 1000)
  if (Math.abs(now - timestampSeconds) > 300) {
    return false
  }

  // Clerk webhook secrets are prefixed with "whsec_" followed by base64
  const secretBytes = Uint8Array.from(atob(WEBHOOK_SECRET.replace(/^whsec_/, '')), c =>
    c.charCodeAt(0)
  )

  const key = await crypto.subtle.importKey(
    'raw',
    secretBytes,
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  )

  const signedContent = `${svixId}.${svixTimestamp}.${body}`
  const signature = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(signedContent))

  const expectedSignature = btoa(String.fromCharCode(...new Uint8Array(signature)))

  // svix-signature may contain multiple signatures separated by spaces (e.g. "v1,base64 v1,base64")
  const signatures = svixSignature.split(' ')
  return signatures.some(sig => {
    const [, sigValue] = sig.split(',')
    return sigValue === expectedSignature
  })
}

const MEMBER_EVENTS = new Set(['user.created', 'user.updated', 'user.deleted'])

/**
 * POST /api/webhooks/clerk — Handles Clerk webhook events.
 * On user changes, invalidates the members cache (Redis + unstable_cache).
 */
export async function POST(request: Request) {
  const body = await request.text()

  const isValid = await verifyWebhookSignature(body, request.headers)
  if (!isValid) {
    logger.warn('Clerk webhook signature verification failed', {
      tags: { type: 'security', component: 'webhook' }
    })
    return NextResponse.json({ error: 'Invalid signature' }, { status: 401 })
  }

  try {
    const event = JSON.parse(body)
    const eventType: string = event.type

    logger.info('Clerk webhook received', {
      data: { type: eventType },
      tags: { type: 'webhook' }
    })

    if (MEMBER_EVENTS.has(eventType)) {
      await invalidateMembersCache()
      logger.info('Members cache invalidated via Clerk webhook', {
        data: { eventType },
        tags: { type: 'webhook' }
      })
    }

    return NextResponse.json({ received: true })
  } catch (error) {
    logger.error('Error processing Clerk webhook', {
      data: error instanceof Error ? { message: error.message } : {},
      tags: { type: 'webhook' }
    })
    return NextResponse.json({ error: 'Webhook processing failed' }, { status: 500 })
  }
}
