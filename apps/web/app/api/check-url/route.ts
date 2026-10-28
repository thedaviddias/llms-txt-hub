import { logger } from '@thedaviddias/logging'
import { SUBMISSION_HOMEPAGE_MAX_BYTES } from '@thedaviddias/submission-trust/constants'
import { createNetworkInspector } from '@thedaviddias/submission-trust/network-inspector'
import { checkWebRiskUrl } from '@thedaviddias/submission-trust/web-risk'
import { type NextRequest, NextResponse } from 'next/server'
import { validatePublicHttpUrl } from '@/lib/url-safety'

// Simple in-memory rate limiting (for production, use Redis or database)
const requestCounts = new Map<string, { count: number; resetTime: number }>()
const MAX_REQUESTS_PER_WINDOW = 10
const RATE_LIMIT_WINDOW_MS = 60 * 1000
const UNAVAILABLE_MESSAGE =
  'We could not safely verify this site right now. Nothing was published. Please try again later.'

/**
 * Creates the hardened URL inspector with server-only reputation credentials.
 */
const createUrlInspector = () =>
  createNetworkInspector({
    checkReputation: url => checkWebRiskUrl(url, { apiKey: process.env.GOOGLE_WEB_RISK_API_KEY })
  })

/**
 * Extract a rate-limit key from the request IP address
 */
function getRateLimitKey(request: NextRequest): string {
  // Use IP address for rate limiting
  const forwarded = request.headers.get('x-forwarded-for')
  const realIP = request.headers.get('x-real-ip')
  const ip = forwarded ? forwarded.split(',')[0].trim() : realIP || 'unknown'
  return `url-check:${ip}`
}

interface CheckRateLimitInput {
  identifier: string
  maxRequests?: number
  windowMs?: number
}

/**
 * Check whether the given identifier has exceeded its rate limit
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
    // First request or window expired
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
 * Handle POST request to check whether a URL is accessible
 */
export async function POST(request: NextRequest) {
  try {
    // Check rate limiting
    const rateLimitKey = getRateLimitKey(request)
    const rateLimit = checkRateLimit({ identifier: rateLimitKey })

    if (!rateLimit.allowed) {
      const retryAfter = rateLimit.resetTime
        ? Math.ceil((rateLimit.resetTime - Date.now()) / 1000)
        : 60
      return NextResponse.json(
        { accessible: false, error: 'Rate limit exceeded. Please try again later.' },
        {
          status: 429,
          headers: {
            'Retry-After': retryAfter.toString(),
            'X-RateLimit-Limit': '10',
            'X-RateLimit-Remaining': '0',
            'X-RateLimit-Reset': rateLimit.resetTime?.toString() || ''
          }
        }
      )
    }

    let body: unknown
    try {
      body = await request.json()
    } catch {
      return NextResponse.json(
        { accessible: false, error: 'Invalid request body.' },
        { status: 400 }
      )
    }
    if (!body || typeof body !== 'object' || !('url' in body)) {
      return NextResponse.json({ accessible: false, error: 'URL is required' }, { status: 400 })
    }
    const { url } = body

    if (!url || typeof url !== 'string') {
      return NextResponse.json({ accessible: false, error: 'URL is required' }, { status: 400 })
    }

    const validation = validatePublicHttpUrl(url)
    if (!validation.ok) {
      return NextResponse.json({ accessible: false, error: validation.error }, { status: 400 })
    }

    const result = await createUrlInspector().inspect(validation.url.toString(), {
      maxBytes: SUBMISSION_HOMEPAGE_MAX_BYTES
    })
    if (result.ok) {
      const { statusCode } = result.resource
      const accessible = statusCode >= 200 && statusCode < 300
      return NextResponse.json({
        accessible,
        status: statusCode,
        statusText: accessible ? 'OK' : '',
        error: accessible ? null : `The site returned HTTP ${statusCode}.`
      })
    }
    const unavailable =
      result.reasonCode === 'reputation_unknown' ||
      result.reasonCode === 'required_resource_transient_failure'
    return NextResponse.json({
      accessible: false,
      error: unavailable ? UNAVAILABLE_MESSAGE : result.failure.safeMessage
    })
  } catch {
    logger.error(new Error('URL check route failed'), {
      tags: { type: 'api', route: 'check-url' }
    })
    return NextResponse.json({ accessible: false, error: 'Internal server error' }, { status: 500 })
  }
}
