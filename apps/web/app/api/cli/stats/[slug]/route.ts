import { type NextRequest, NextResponse } from 'next/server'
import { getRawClient } from '@/lib/redis'

/**
 * GET /api/cli/stats/[slug]
 *
 * Returns the total install count for a CLI skill from Redis.
 * Falls back to 0 when Redis is unavailable.
 */
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  const { slug } = await params

  if (!slug || typeof slug !== 'string') {
    return NextResponse.json({ error: 'Missing slug' }, { status: 400 })
  }

  const redis = getRawClient()
  if (!redis) {
    return NextResponse.json({ count: 0 })
  }

  try {
    const count = await redis.hget<number>('telemetry:skills:total', slug)
    return NextResponse.json(
      { count: count ?? 0 },
      {
        headers: {
          'Cache-Control': 'public, s-maxage=300, stale-while-revalidate=600'
        }
      }
    )
  } catch {
    return NextResponse.json({ count: 0 })
  }
}
