import * as Sentry from '@sentry/nextjs'
import { logger } from '@thedaviddias/logging'
import { type NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'

const requestCounts = new Map<string, { count: number; resetTime: number }>()
const MAX_REQUESTS_PER_WINDOW = 10
const RATE_LIMIT_WINDOW_MS = 60 * 1000

const feedbackPayloadSchema = z
  .object({
    event: z.literal('uninstall'),
    reason: z.string().trim().min(1),
    comment: z.string().trim().max(1000).optional(),
    version: z.string().trim().max(64).optional(),
    lang: z.string().trim().max(35).optional(),
    submittedAt: z.string().datetime({ offset: true })
  })
  .strict()

interface CheckRateLimitInput {
  identifier: string
  maxRequests?: number
  windowMs?: number
}

/**
 * Build a per-IP rate-limit key from proxy headers.
 *
 * @param request - Incoming request
 * @returns Stable key used by the in-memory limiter
 */
function getRateLimitKey(request: NextRequest): string {
  const forwarded = request.headers.get('x-forwarded-for')
  const realIP = request.headers.get('x-real-ip')
  const ip = forwarded ? forwarded.split(',')[0].trim() : realIP || 'unknown'
  return `extension-feedback:${ip}`
}

/**
 * Apply a windowed in-memory rate limit for the feedback endpoint.
 *
 * @param input - Limiter input values
 * @returns Allow/deny result with optional reset timestamp
 */
function checkRateLimit(input: CheckRateLimitInput): { allowed: boolean; resetTime?: number } {
  const {
    identifier,
    maxRequests = MAX_REQUESTS_PER_WINDOW,
    windowMs = RATE_LIMIT_WINDOW_MS
  } = input
  const now = Date.now()

  if (requestCounts.size > 1000) {
    for (const [key, value] of requestCounts.entries()) {
      if (now > value.resetTime) {
        requestCounts.delete(key)
      }
    }
  }

  const record = requestCounts.get(identifier)

  if (!record || now > record.resetTime) {
    requestCounts.set(identifier, { count: 1, resetTime: now + windowMs })
    return { allowed: true }
  }

  if (record.count >= maxRequests) {
    return { allowed: false, resetTime: record.resetTime }
  }

  record.count++
  return { allowed: true }
}

/**
 * Handle uninstall feedback submissions from extension lifecycle pages.
 *
 * @param request - JSON request containing uninstall feedback payload
 * @returns API response with success/error state
 */
export async function POST(request: NextRequest) {
  try {
    const rateLimitKey = getRateLimitKey(request)
    const rateLimit = checkRateLimit({ identifier: rateLimitKey })

    if (!rateLimit.allowed) {
      const retryAfter = rateLimit.resetTime
        ? Math.ceil((rateLimit.resetTime - Date.now()) / 1000)
        : 60

      return NextResponse.json(
        { ok: false, error: 'Rate limit exceeded. Please try again later.' },
        {
          status: 429,
          headers: {
            'Retry-After': retryAfter.toString()
          }
        }
      )
    }

    let body: unknown
    try {
      body = await request.json()
    } catch {
      return NextResponse.json({ ok: false, error: 'Invalid JSON payload' }, { status: 400 })
    }

    const parseResult = feedbackPayloadSchema.safeParse(body)
    if (!parseResult.success) {
      return NextResponse.json(
        {
          ok: false,
          error: 'Invalid feedback payload',
          details: parseResult.error.flatten()
        },
        { status: 400 }
      )
    }

    const payload = parseResult.data

    // Log-only retention in this phase. We intentionally avoid collecting identifiers.
    logger.info('Extension uninstall feedback received', {
      data: {
        event: payload.event,
        reason: payload.reason,
        commentLength: payload.comment?.length || 0,
        version: payload.version || null,
        lang: payload.lang || null,
        submittedAt: payload.submittedAt
      },
      tags: {
        type: 'extension-feedback',
        source: 'uninstall'
      }
    })

    return NextResponse.json({ ok: true })
  } catch (error) {
    logger.error('Failed to process extension feedback', {
      data: error,
      tags: { type: 'extension-feedback', source: 'uninstall' }
    })

    Sentry.captureException(error, {
      tags: {
        operation: 'extension_feedback_submission'
      }
    })

    return NextResponse.json(
      {
        ok: false,
        error: 'Unable to process feedback right now. Please try again later.'
      },
      { status: 500 }
    )
  }
}
