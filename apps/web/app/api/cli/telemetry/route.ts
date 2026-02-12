import { Redis } from '@upstash/redis'
import { type NextRequest, NextResponse } from 'next/server'

const ALLOWED_EVENTS = ['install', 'remove', 'init', 'update', 'search'] as const

const DAY_SECONDS = 86_400
const TTL_DAYS = 90
const TTL_SECONDS = TTL_DAYS * DAY_SECONDS

// In-memory rate limiting (same pattern as check-url/route.ts)
const requestCounts = new Map<string, { count: number; resetTime: number }>()

/**
 * Extract client IP from request headers for rate limiting.
 */
function getRateLimitKey(request: NextRequest): string {
  const forwarded = request.headers.get('x-forwarded-for')
  const realIP = request.headers.get('x-real-ip')
  const ip = forwarded ? forwarded.split(',')[0].trim() : realIP || 'unknown'
  return `cli-telemetry:${ip}`
}

/**
 * Check if a request is within the rate limit window (60 req/min).
 */
function checkRateLimit(identifier: string): { allowed: boolean; resetTime?: number } {
  const maxRequests = 60
  const windowMs = 60_000
  const now = Date.now()

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
 * Create a Redis client from environment variables, or null if not configured.
 */
function getRedis(): Redis | null {
  const url = process.env.UPSTASH_REDIS_REST_URL
  const token = process.env.UPSTASH_REDIS_REST_TOKEN
  if (!url || !token) return null
  return new Redis({ url, token })
}

/**
 * Return today's date in YYYY-MM-DD format for Redis key partitioning.
 */
function todayKey(): string {
  return new Date().toISOString().slice(0, 10)
}

/**
 * Type guard to validate that a value is a known telemetry event.
 */
function isValidEvent(value: unknown): value is (typeof ALLOWED_EVENTS)[number] {
  if (typeof value !== 'string') return false
  return ALLOWED_EVENTS.some(e => e === value)
}

/**
 * Handle CLI telemetry POST requests.
 */
export async function POST(request: NextRequest) {
  try {
    const rateLimitKey = getRateLimitKey(request)
    const rateLimit = checkRateLimit(rateLimitKey)

    if (!rateLimit.allowed) {
      const retryAfter = rateLimit.resetTime
        ? Math.ceil((rateLimit.resetTime - Date.now()) / 1000)
        : 60
      return NextResponse.json(
        { ok: false, error: 'Rate limit exceeded' },
        {
          status: 429,
          headers: { 'Retry-After': retryAfter.toString() }
        }
      )
    }

    const body = await request.json()
    const { event, skills } = body

    // Validate event type
    if (!isValidEvent(event)) {
      return NextResponse.json({ ok: false, error: 'Invalid event type' }, { status: 400 })
    }

    const redis = getRedis()
    if (!redis) {
      // Redis not configured — accept silently
      return NextResponse.json({ ok: true })
    }

    const date = todayKey()
    const pipeline = redis.pipeline()

    // Per-event type daily counter
    pipeline.hincrby(`telemetry:events:${date}`, event, 1)

    // Per-skill counters
    if (skills && typeof skills === 'string') {
      const slugs = skills
        .split(',')
        .map(s => s.trim())
        .filter(Boolean)
      for (const slug of slugs) {
        pipeline.hincrby(`telemetry:daily:${date}`, slug, 1)
        pipeline.hincrby('telemetry:skills:total', slug, 1)
      }
    }

    // Set TTL on daily keys (idempotent — resets TTL each time, which is fine)
    pipeline.expire(`telemetry:events:${date}`, TTL_SECONDS)
    pipeline.expire(`telemetry:daily:${date}`, TTL_SECONDS)

    await pipeline.exec()

    return NextResponse.json({ ok: true })
  } catch {
    return NextResponse.json({ ok: true })
  }
}
