import { Redis } from '@upstash/redis'
import { type NextRequest, NextResponse } from 'next/server'

const ALLOWED_EVENTS = ['install', 'remove', 'init', 'update', 'search'] as const

const DAY_SECONDS = 86_400
const TTL_DAYS = 90
const TTL_SECONDS = TTL_DAYS * DAY_SECONDS

const RATE_LIMIT_MAX = 60
const RATE_LIMIT_WINDOW_SECONDS = 60

// Module-scoped Redis client (reused across requests)
const redisUrl = process.env.UPSTASH_REDIS_REST_URL
const redisToken = process.env.UPSTASH_REDIS_REST_TOKEN
const redis: Redis | null =
  redisUrl && redisToken ? new Redis({ url: redisUrl, token: redisToken }) : null

/**
 * Extract client IP from request headers for rate limiting.
 */
function getRateLimitKey(request: NextRequest): string {
  const forwarded = request.headers.get('x-forwarded-for')
  const realIP = request.headers.get('x-real-ip')
  const ip = forwarded ? forwarded.split(',')[0].trim() : realIP || 'unknown'
  return ip
}

/**
 * Check rate limit using Redis INCR + EXPIRE for serverless-safe windowed limiting.
 * Returns null (allowed) or the number of seconds until the window resets.
 */
async function checkRateLimit(
  clientIp: string
): Promise<{ allowed: boolean; retryAfterSeconds?: number }> {
  if (!redis) {
    // No Redis — allow all requests (best-effort, no durable rate limit)
    return { allowed: true }
  }

  const key = `telemetry:rate:${clientIp}`
  const count = await redis.incr(key)

  // Set TTL on the first request in a new window
  if (count === 1) {
    await redis.expire(key, RATE_LIMIT_WINDOW_SECONDS)
  }

  if (count > RATE_LIMIT_MAX) {
    const ttl = await redis.ttl(key)
    return { allowed: false, retryAfterSeconds: ttl > 0 ? ttl : RATE_LIMIT_WINDOW_SECONDS }
  }

  return { allowed: true }
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
    const clientIp = getRateLimitKey(request)
    const rateLimit = await checkRateLimit(clientIp)

    if (!rateLimit.allowed) {
      return NextResponse.json(
        { ok: false, error: 'Rate limit exceeded' },
        {
          status: 429,
          headers: {
            'Retry-After': (rateLimit.retryAfterSeconds ?? RATE_LIMIT_WINDOW_SECONDS).toString()
          }
        }
      )
    }

    const body = await request.json()
    const { event, skills } = body

    // Validate event type
    if (!isValidEvent(event)) {
      return NextResponse.json({ ok: false, error: 'Invalid event type' }, { status: 400 })
    }

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
