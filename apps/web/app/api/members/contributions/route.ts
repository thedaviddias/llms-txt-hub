import { logger } from '@thedaviddias/logging'
import { withRateLimit } from '@thedaviddias/rate-limiting'
import { type NextRequest, NextResponse } from 'next/server'
import { getUserContributions } from '@/lib/github-contributions'
import { CACHE_KEYS, CACHE_TTL, get, set } from '@/lib/redis'

interface ContributionsRequest {
  usernames: string[]
}

interface UserContributionStatus {
  username: string
  hasContributions: boolean
  error?: string
}

interface ContributionsResponse {
  contributions: UserContributionStatus[]
}

/**
 * POST /api/members/contributions - Fetches GitHub contribution status for multiple users
 * @param request - Next.js request object with JSON body containing usernames array
 * @returns Promise resolving to NextResponse with contribution status data or error
 */
export async function POST(
  request: NextRequest
): Promise<NextResponse<ContributionsResponse | { error: string }> | Response> {
  return await withRateLimit(request, 'CONTRIBUTIONS_API', async () => {
    try {
      const body: ContributionsRequest = await request.json()

      if (!body.usernames || !Array.isArray(body.usernames)) {
        return NextResponse.json(
          { error: 'Invalid request: usernames array required' },
          { status: 400 }
        )
      }

      // Limit the number of usernames to prevent abuse
      if (body.usernames.length > 50) {
        return NextResponse.json({ error: 'Too many usernames requested' }, { status: 400 })
      }

      // Filter out invalid usernames
      const validUsernames = body.usernames
        .filter(username => typeof username === 'string' && username.trim().length > 0)
        .slice(0, 50)

      if (validUsernames.length === 0) {
        return NextResponse.json({ contributions: [] })
      }

      // Batch fetch contributions with controlled concurrency
      const batchSize = 10 // Process in batches to avoid overwhelming GitHub API
      const results: UserContributionStatus[] = []

      for (let i = 0; i < validUsernames.length; i += batchSize) {
        const batch = validUsernames.slice(i, i + batchSize)

        const batchPromises = batch.map(async (username): Promise<UserContributionStatus> => {
          const cacheKey = `${CACHE_KEYS.GITHUB_CONTRIBUTIONS}${username}`

          try {
            // Try to get from cache first
            const cached = await get<UserContributionStatus>(cacheKey)
            if (cached) {
              logger.debug(`Cache hit for contributions: ${username}`, {
                tags: { type: 'cache', operation: 'hit', resource: 'contributions' }
              })
              return cached
            }

            // Cache miss - fetch from GitHub API
            logger.debug(`Cache miss for contributions: ${username}`, {
              tags: { type: 'cache', operation: 'miss', resource: 'contributions' }
            })

            const contributions = await getUserContributions(username)
            const result: UserContributionStatus = {
              username,
              hasContributions: contributions.total > 0
            }

            // Cache the result for future requests
            await set(cacheKey, result, CACHE_TTL.GITHUB_CONTRIBUTIONS)

            return result
          } catch (error) {
            logger.warn(`Error fetching contributions for ${username}:`, {
              data: error,
              tags: { type: 'github-api', error: 'contributions' }
            })

            // Don't cache errors - allow retry on next request
            return {
              username,
              hasContributions: false,
              error: 'Failed to fetch contributions'
            }
          }
        })

        // Wait for this batch to complete before processing the next
        const batchResults = await Promise.allSettled(batchPromises)

        batchResults.forEach((result, index) => {
          if (result.status === 'fulfilled') {
            results.push(result.value)
          } else {
            results.push({
              username: batch[index],
              hasContributions: false,
              error: 'Promise rejected'
            })
          }
        })

        // Small delay between batches to be respectful to GitHub API
        if (i + batchSize < validUsernames.length) {
          await new Promise(resolve => setTimeout(resolve, 100))
        }
      }

      return NextResponse.json({ contributions: results })
    } catch (error) {
      logger.error('Error fetching member contributions:', { data: error, tags: { type: 'api' } })
      return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
    }
  })
}
