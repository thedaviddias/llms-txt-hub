import { logger } from '@thedaviddias/logging'
import type { NextRequest } from 'next/server'
import { CACHE_KEYS, del, incr, isAvailable } from './redis'

/**
 * Rate limiting configuration for different API endpoints
 */
export const RATE_LIMITS = {
  // API endpoints
  CONTRIBUTIONS_API: { requests: 100, window: 3600 }, // 100 requests per hour
  MEMBERS_API: { requests: 200, window: 3600 }, // 200 requests per hour
  METADATA_API: { requests: 50, window: 3600 }, // 50 requests per hour
  SUBMIT_API: { requests: 10, window: 3600 }, // 10 submissions per hour

  // General API access
  GENERAL_API: { requests: 500, window: 3600 }, // 500 requests per hour

  // Authentication related
  AUTH_API: { requests: 20, window: 900 } // 20 requests per 15 minutes
} as const

/**
 * Extract client identifier from request
 * Uses multiple fallbacks for identification
 */
function getClientId(request: NextRequest): string {
  // Try to get real IP from headers (Vercel/Cloudflare)
  const forwardedFor = request.headers.get('x-forwarded-for')
  if (forwardedFor) {
    // Take the first IP from the chain
    const firstIp = forwardedFor.split(',')[0]?.trim()
    if (firstIp) return firstIp
  }

  // Fallback headers
  const realIp = request.headers.get('x-real-ip')
  if (realIp) return realIp

  const cfConnectingIp = request.headers.get('cf-connecting-ip')
  if (cfConnectingIp) return cfConnectingIp

  // Fallback to user agent hash for client-side requests
  const userAgent = request.headers.get('user-agent')
  if (userAgent) {
    // Simple hash function for user agent
    let hash = 0
    for (let i = 0; i < userAgent.length; i++) {
      const char = userAgent.charCodeAt(i)
      hash = (hash << 5) - hash + char
      hash = hash & hash // Convert to 32bit integer
    }
    return `ua:${Math.abs(hash)}`
  }

  // Ultimate fallback
  return 'unknown'
}

/**
 * Rate limit result
 */
export interface RateLimitResult {
  success: boolean
  limit: number
  remaining: number
  reset: number
  retryAfter?: number
}

/**
 * Check rate limit for a client and endpoint
 */
export async function checkRateLimit(
  request: NextRequest,
  endpoint: keyof typeof RATE_LIMITS
): Promise<RateLimitResult> {
  const clientId = getClientId(request)
  const config = RATE_LIMITS[endpoint]
  const key = `${CACHE_KEYS.RATE_LIMIT}${endpoint}:${clientId}`

  // Only log in development
  if (process.env.NODE_ENV === 'development') {
    logger.debug('Checking rate limit', {
      data: { clientId, endpoint, key },
      tags: { type: 'rate-limit', operation: 'check' }
    })
  }

  try {
    if (!isAvailable()) {
      // If Redis is not available, allow requests silently

      return {
        success: true,
        limit: config.requests,
        remaining: config.requests - 1,
        reset: Date.now() + config.window * 1000
      }
    }

    // Increment counter and get current value
    const current = await incr(key, config.window)

    if (current === null) {
      // Redis error - allow request but log
      logger.error('Redis error during rate limit check - allowing request', {
        data: { clientId, endpoint },
        tags: { type: 'rate-limit', error: 'redis-error' }
      })

      return {
        success: true,
        limit: config.requests,
        remaining: config.requests - 1,
        reset: Date.now() + config.window * 1000
      }
    }

    const remaining = Math.max(0, config.requests - current)
    const reset = Date.now() + config.window * 1000

    if (current > config.requests) {
      // Rate limit exceeded
      logger.warn('Rate limit exceeded', {
        data: {
          clientId,
          endpoint,
          current,
          limit: config.requests,
          window: config.window
        },
        tags: { type: 'rate-limit', status: 'exceeded' }
      })

      return {
        success: false,
        limit: config.requests,
        remaining: 0,
        reset,
        retryAfter: config.window
      }
    }

    // Within rate limit
    logger.debug('Rate limit check passed', {
      data: { clientId, endpoint, current, remaining },
      tags: { type: 'rate-limit', status: 'allowed' }
    })

    return {
      success: true,
      limit: config.requests,
      remaining,
      reset
    }
  } catch (error) {
    logger.error('Rate limit check failed', {
      data: {
        clientId,
        endpoint,
        error: error instanceof Error ? error.message : 'Unknown error'
      },
      tags: { type: 'rate-limit', error: 'check-failed' }
    })

    // On error, allow the request but log it
    return {
      success: true,
      limit: config.requests,
      remaining: config.requests - 1,
      reset: Date.now() + config.window * 1000
    }
  }
}

/**
 * Middleware-style rate limiter that returns appropriate HTTP response
 */
export async function withRateLimit<T>(
  request: NextRequest,
  endpoint: keyof typeof RATE_LIMITS,
  handler: () => Promise<T>
): Promise<T | Response> {
  const rateLimitResult = await checkRateLimit(request, endpoint)

  // Add rate limit headers to response
  const headers = new Headers()
  headers.set('X-RateLimit-Limit', rateLimitResult.limit.toString())
  headers.set('X-RateLimit-Remaining', rateLimitResult.remaining.toString())
  headers.set('X-RateLimit-Reset', rateLimitResult.reset.toString())

  if (!rateLimitResult.success) {
    if (rateLimitResult.retryAfter) {
      headers.set('Retry-After', rateLimitResult.retryAfter.toString())
    }

    return new Response(
      JSON.stringify({
        error: 'Rate limit exceeded',
        message: `Too many requests. Try again in ${rateLimitResult.retryAfter} seconds.`,
        retryAfter: rateLimitResult.retryAfter
      }),
      {
        status: 429,
        headers: {
          'Content-Type': 'application/json',
          ...Object.fromEntries(headers.entries())
        }
      }
    )
  }

  // Execute the handler and add rate limit headers to successful response
  const result = await handler()

  // If result is a Response, add rate limit headers
  if (result instanceof Response) {
    headers.forEach((value, key) => {
      result.headers.set(key, value)
    })
  }

  return result
}

/**
 * Reset rate limit for a client (useful for testing or admin overrides)
 */
export async function resetRateLimit(
  clientId: string,
  endpoint: keyof typeof RATE_LIMITS
): Promise<boolean> {
  const key = `${CACHE_KEYS.RATE_LIMIT}${endpoint}:${clientId}`
  return await del(key)
}
