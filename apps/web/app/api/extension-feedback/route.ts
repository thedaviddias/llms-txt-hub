import crypto from 'node:crypto'
import * as Sentry from '@sentry/nextjs'
import { logger } from '@thedaviddias/logging'
import { type NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { getRawClient } from '@/lib/redis'

const requestCounts = new Map<string, { count: number; resetTime: number }>()
const MAX_REQUESTS_PER_WINDOW = 10
const RATE_LIMIT_WINDOW_MS = 60 * 1000
const FEEDBACK_STORAGE_KEY = 'extension-feedback:uninstall:v1'
const MAX_STORED_FEEDBACK_ITEMS = 1000
const FEEDBACK_READ_TOKEN_HEADER = 'x-feedback-token'
const FEEDBACK_READ_TOKEN_ENV = 'EXTENSION_FEEDBACK_READ_TOKEN'
const MAX_FEEDBACK_LIST_LIMIT = 200
const DEFAULT_FEEDBACK_LIST_LIMIT = 50

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

interface PersistedExtensionFeedback {
  id: string
  event: 'uninstall'
  reason: string
  comment?: string
  version?: string
  lang?: string
  submittedAt: string
  receivedAt: string
}

const persistedFeedbackSchema = z
  .object({
    id: z.string().trim().min(1),
    event: z.literal('uninstall'),
    reason: z.string().trim().min(1),
    comment: z.string().trim().max(1000).optional(),
    version: z.string().trim().max(64).optional(),
    lang: z.string().trim().max(35).optional(),
    submittedAt: z.string().datetime({ offset: true }),
    receivedAt: z.string().datetime({ offset: true })
  })
  .strict()

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
 * Read extension feedback API token from environment.
 */
function getFeedbackReadToken(): string | null {
  const token = process.env[FEEDBACK_READ_TOKEN_ENV]?.trim()
  return token ? token : null
}

/**
 * Perform constant-time token comparison.
 */
function tokensMatch(provided: string, expected: string): boolean {
  const providedBuffer = Buffer.from(provided)
  const expectedBuffer = Buffer.from(expected)
  return (
    providedBuffer.length === expectedBuffer.length &&
    crypto.timingSafeEqual(providedBuffer, expectedBuffer)
  )
}

/**
 * Resolve request limit with guard rails.
 */
function parseFeedbackListLimit(request: NextRequest): number {
  const searchParams =
    request.nextUrl?.searchParams ?? new URL(request.url, 'http://localhost').searchParams
  const limitParam = searchParams.get('limit')
  const parsedLimit = Number.parseInt(limitParam || '', 10)
  if (Number.isNaN(parsedLimit) || parsedLimit <= 0) {
    return DEFAULT_FEEDBACK_LIST_LIMIT
  }
  return Math.min(parsedLimit, MAX_FEEDBACK_LIST_LIMIT)
}

/**
 * Persist full uninstall feedback payload to Redis for later review.
 */
async function persistFeedback(feedback: PersistedExtensionFeedback): Promise<void> {
  const redis = getRawClient()
  if (!redis) {
    logger.warn('Redis unavailable for extension feedback persistence', {
      data: {
        feedbackId: feedback.id,
        storageKey: FEEDBACK_STORAGE_KEY
      },
      tags: {
        type: 'extension-feedback',
        source: 'uninstall'
      }
    })
    return
  }

  const pipeline = redis.pipeline()
  pipeline.lpush(FEEDBACK_STORAGE_KEY, JSON.stringify(feedback))
  pipeline.ltrim(FEEDBACK_STORAGE_KEY, 0, MAX_STORED_FEEDBACK_ITEMS - 1)
  await pipeline.exec()
}

/**
 * Read persisted feedback entries from Redis.
 */
async function readPersistedFeedback(limit: number): Promise<PersistedExtensionFeedback[]> {
  const redis = getRawClient()
  if (!redis) {
    return []
  }

  const entries = await redis.lrange<string>(FEEDBACK_STORAGE_KEY, 0, limit - 1)
  const parsedEntries: PersistedExtensionFeedback[] = []

  for (const entry of entries) {
    try {
      const parsedEntry = persistedFeedbackSchema.safeParse(JSON.parse(entry))
      if (parsedEntry.success) {
        parsedEntries.push(parsedEntry.data)
      }
    } catch {
      // Skip malformed rows rather than failing the whole request.
    }
  }

  return parsedEntries
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
    const feedback: PersistedExtensionFeedback = {
      id: crypto.randomUUID(),
      event: payload.event,
      reason: payload.reason,
      comment: payload.comment,
      version: payload.version,
      lang: payload.lang,
      submittedAt: payload.submittedAt,
      receivedAt: new Date().toISOString()
    }

    await persistFeedback(feedback)

    // Keep logs for ops visibility; full payload is now stored in Redis.
    logger.info('Extension uninstall feedback received', {
      data: {
        id: feedback.id,
        event: feedback.event,
        reason: feedback.reason,
        comment: feedback.comment || null,
        version: feedback.version || null,
        lang: feedback.lang || null,
        submittedAt: feedback.submittedAt
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

/**
 * List recent uninstall feedback entries.
 *
 * Requires `x-feedback-token` header matching `EXTENSION_FEEDBACK_READ_TOKEN`.
 */
export async function GET(request: NextRequest) {
  try {
    const requiredToken = getFeedbackReadToken()
    if (!requiredToken) {
      return NextResponse.json({ ok: false, error: 'Not found' }, { status: 404 })
    }

    const providedToken = request.headers.get(FEEDBACK_READ_TOKEN_HEADER)
    if (!providedToken || !tokensMatch(providedToken, requiredToken)) {
      return NextResponse.json({ ok: false, error: 'Unauthorized' }, { status: 401 })
    }

    const limit = parseFeedbackListLimit(request)
    const feedback = await readPersistedFeedback(limit)

    return NextResponse.json({
      ok: true,
      feedback,
      count: feedback.length
    })
  } catch (error) {
    logger.error('Failed to read extension feedback', {
      data: error,
      tags: { type: 'extension-feedback', source: 'uninstall' }
    })

    Sentry.captureException(error, {
      tags: {
        operation: 'extension_feedback_list'
      }
    })

    return NextResponse.json(
      {
        ok: false,
        error: 'Unable to load feedback right now.'
      },
      { status: 500 }
    )
  }
}
