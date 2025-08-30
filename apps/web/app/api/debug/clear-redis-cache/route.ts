import { logger } from '@thedaviddias/logging'
import { type NextRequest, NextResponse } from 'next/server'
import { CACHE_KEYS, del } from '@/lib/redis'

/**
 * POST handler for clearing Redis cache for a specific user
 *
 * @param request - NextRequest containing username in body
 * @returns Promise resolving to NextResponse with cache clear result or error
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
