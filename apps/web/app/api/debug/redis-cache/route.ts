import { CACHE_KEYS, get } from '@/lib/redis'
import { logger } from '@thedaviddias/logging'
import { type NextRequest, NextResponse } from 'next/server'

/**
 * GET handler for debugging Redis cache status
 * 
 * @param request - NextRequest with username query parameter
 * @returns Promise resolving to NextResponse with cache status or error
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
