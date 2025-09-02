import { Ratelimit, type RatelimitConfig } from '@upstash/ratelimit'
import { Redis } from '@upstash/redis'
import type { NextRequest } from 'next/server'
import { keys } from './keys'

let redisClient: Redis | null = null

const getRedisClient = (): Redis => {
  if (!redisClient) {
    const config = keys()
    if (!config.STORAGE_REDIS_URL || !config.STORAGE_KV_REST_API_TOKEN) {
      throw new Error(
        'Vercel Redis configuration is missing. Please set STORAGE_REDIS_URL and STORAGE_KV_REST_API_TOKEN environment variables.'
      )
    }

    redisClient = new Redis({
      url: config.STORAGE_REDIS_URL,
      token: config.STORAGE_KV_REST_API_TOKEN
    })
  }
  return redisClient
}

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
  // Helper to validate basic IP format (v4 or v6)
  const isValidIp = (ip: string): boolean => {
    if (!ip || ip.length === 0) return false
    // Basic validation: contains dots (IPv4) or colons (IPv6), no spaces
    return (ip.includes('.') || ip.includes(':')) && !ip.includes(' ')
  }

  // 1. Prefer Vercel-specific header (prevents spoofing)
  const vercelForwarded = request.headers.get('x-vercel-forwarded-for')
  if (vercelForwarded) {
    const firstIp = vercelForwarded.split(',')[0]?.trim()
    if (firstIp && isValidIp(firstIp)) return firstIp
  }

  // 2. Standard forwarded-for header (first hop)
  const forwardedFor = request.headers.get('x-forwarded-for')
  if (forwardedFor) {
    const firstIp = forwardedFor.split(',')[0]?.trim()
    if (firstIp && isValidIp(firstIp)) return firstIp
  }

  // 3. Real IP header
  const realIp = request.headers.get('x-real-ip')
  if (realIp && isValidIp(realIp.trim())) return realIp.trim()

  // 4. Cloudflare connecting IP
  const cfConnectingIp = request.headers.get('cf-connecting-ip')
  if (cfConnectingIp && isValidIp(cfConnectingIp.trim())) return cfConnectingIp.trim()

  // 5. Fallback to user agent hash for client-side requests
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

  // 6. Ultimate fallback
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

  try {
    const rateLimiter = new Ratelimit({
      redis: getRedisClient(),
      limiter: Ratelimit.slidingWindow(config.requests, `${config.window} s`),
      prefix: `llms-txt-hub:${endpoint}`
    })

    const { success, limit, remaining, reset } = await rateLimiter.limit(clientId)

    if (!success) {
      const retryAfter = Math.ceil((reset - Date.now()) / 1000)
      return {
        success: false,
        limit,
        remaining,
        reset,
        retryAfter
      }
    }

    return {
      success: true,
      limit,
      remaining,
      reset
    }
  } catch (error) {
    // On error, allow the request but log it
    console.error('Rate limit check failed:', error)
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
 * Creates a custom rate limiter with specified configuration
 * @param props - Rate limiter configuration without redis client
 * @returns Configured Ratelimit instance
 */
export const createRateLimiter = (props: Omit<RatelimitConfig, 'redis'>) =>
  new Ratelimit({
    redis: getRedisClient(),
    limiter: props.limiter ?? Ratelimit.slidingWindow(10, '10 s'),
    prefix: props.prefix ?? 'next-forge'
  })

export const { slidingWindow } = Ratelimit
