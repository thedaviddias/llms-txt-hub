import { logger } from '@thedaviddias/logging'
import { type NextRequest, NextResponse } from 'next/server'
import { validatePublicHttpUrl } from '@/lib/url-safety'

// Simple in-memory rate limiting (for production, use Redis or database)
const requestCounts = new Map<string, { count: number; resetTime: number }>()
const MAX_REQUESTS_PER_WINDOW = 10
const RATE_LIMIT_WINDOW_MS = 60 * 1000
const URL_CHECK_TIMEOUT_MS = 5000

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
 * Execute a fetch request with AbortController timeout handling.
 */
async function fetchWithTimeout(
  url: string,
  init: RequestInit,
  timeoutMs: number
): Promise<Response> {
  const controller = new AbortController()
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs)

  try {
    return await fetch(url, { ...init, signal: controller.signal })
  } finally {
    clearTimeout(timeoutId)
  }
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

    const body = await request.json()
    const { url } = body

    if (!url || typeof url !== 'string') {
      return NextResponse.json({ accessible: false, error: 'URL is required' }, { status: 400 })
    }

    const validation = validatePublicHttpUrl(url)
    if (!validation.ok) {
      return NextResponse.json({ accessible: false, error: validation.error }, { status: 400 })
    }

    // Check URL accessibility with additional security headers
    try {
      const response = await fetchWithTimeout(
        validation.url.toString(),
        {
          method: 'HEAD', // Use HEAD to avoid downloading content
          headers: {
            'User-Agent': 'LLMs.txt Hub URL Checker/1.0',
            Accept: 'text/html,application/xhtml+xml',
            'Cache-Control': 'no-cache'
          },
          // Security: Prevent following too many redirects
          redirect: 'manual'
        },
        URL_CHECK_TIMEOUT_MS
      )

      const accessible = response.ok // 2xx status codes

      return NextResponse.json({
        accessible,
        status: response.status,
        statusText: response.statusText,
        error: accessible ? null : `HTTP ${response.status}: ${response.statusText}`
      })
    } catch (error) {
      let errorMessage = 'Failed to reach URL'

      if (error instanceof Error) {
        if (error.name === 'AbortError' || error.name === 'TimeoutError') {
          errorMessage = 'Request timed out'
        } else if (error.message.includes('fetch')) {
          errorMessage = 'Network error or URL unreachable'
        } else {
          errorMessage = error.message
        }
      }

      return NextResponse.json({
        accessible: false,
        error: errorMessage
      })
    }
  } catch (error) {
    logger.error(error instanceof Error ? error : new Error(String(error)), {
      data: error,
      tags: { type: 'api', route: 'check-url' }
    })
    return NextResponse.json({ accessible: false, error: 'Internal server error' }, { status: 500 })
  }
}
