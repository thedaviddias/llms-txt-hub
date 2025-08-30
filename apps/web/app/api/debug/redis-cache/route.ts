import { logger } from '@thedaviddias/logging'
import { type NextRequest, NextResponse } from 'next/server'
import { CACHE_KEYS, get } from '@/lib/redis'

/**
 * GET route handler that checks the Redis cache for a GitHub contributions entry for the given username.
 *
 * Expects a `username` query parameter. If present, constructs the cache key using
 * `CACHE_KEYS.GITHUB_CONTRIBUTIONS + username`, reads the value from Redis, and returns a JSON payload
 * with `username`, `cacheKey`, `hasCachedData` (boolean), `cachedData`, and a `timestamp`.
 *
 * Returns a 400 JSON response when `username` is missing, and a 500 JSON response if checking Redis fails.
 *
 * @param request - Incoming NextRequest; must include the `username` query parameter
 * @returns A NextResponse containing the cache status and data, or an error payload with appropriate HTTP status
 */
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const username = searchParams.get('username')

  if (!username) {
    return NextResponse.json({ error: 'Username parameter required' }, { status: 400 })
  }

  try {
    const cacheKey = `${CACHE_KEYS.GITHUB_CONTRIBUTIONS}${username}`
    const cached = await get(cacheKey)

    logger.info('Debug: Checking Redis cache for contributions', {
      data: { username, cacheKey, hasCachedData: !!cached },
      tags: { type: 'debug', component: 'redis-cache' }
    })

    return NextResponse.json({
      username,
      cacheKey,
      hasCachedData: !!cached,
      cachedData: cached,
      timestamp: new Date().toISOString()
    })
  } catch (error) {
    logger.error('Debug: Error checking Redis cache', {
      data: { username, error: error instanceof Error ? error.message : 'Unknown error' },
      tags: { type: 'debug', component: 'redis-cache', error: 'check-failed' }
    })

    return NextResponse.json(
      {
        error: 'Failed to check Redis cache',
        details: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date().toISOString()
      },
      { status: 500 }
    )
  }
}
