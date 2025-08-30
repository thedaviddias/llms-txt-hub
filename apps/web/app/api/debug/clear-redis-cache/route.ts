import { logger } from '@thedaviddias/logging'
import { type NextRequest, NextResponse } from 'next/server'
import { CACHE_KEYS, del } from '@/lib/redis'

/**
 * Clears Redis cache entry for a user's GitHub contributions.
 *
 * Expects a JSON body containing `username`. If `username` is missing the handler
 * responds with 400. It deletes the Redis key formed as
 * `${CACHE_KEYS.GITHUB_CONTRIBUTIONS}${username}` and returns a JSON response
 * containing `username`, `cacheKey`, `deleted` (truthy when a key was removed),
 * a human-readable `message`, and a `timestamp`. On internal errors it responds
 * with 500 and a JSON payload containing `error`, `details`, and `timestamp`.
 *
 * @param request - NextRequest whose JSON body must include `username`.
 * @returns NextResponse with the result of the cache clear operation or error details.
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { username } = body

    if (!username) {
      return NextResponse.json({ error: 'Username parameter required' }, { status: 400 })
    }

    const cacheKey = `${CACHE_KEYS.GITHUB_CONTRIBUTIONS}${username}`
    const deleted = await del(cacheKey)

    logger.info('Debug: Clearing Redis cache for contributions', {
      data: { username, cacheKey, deleted },
      tags: { type: 'debug', component: 'redis-cache' }
    })

    return NextResponse.json({
      username,
      cacheKey,
      deleted,
      message: deleted ? 'Cache cleared successfully' : 'Cache was not found or already cleared',
      timestamp: new Date().toISOString()
    })
  } catch (error) {
    logger.error('Debug: Error clearing Redis cache', {
      data: { error: error instanceof Error ? error.message : 'Unknown error' },
      tags: { type: 'debug', component: 'redis-cache', error: 'clear-failed' }
    })

    return NextResponse.json(
      {
        error: 'Failed to clear Redis cache',
        details: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date().toISOString()
      },
      { status: 500 }
    )
  }
}
