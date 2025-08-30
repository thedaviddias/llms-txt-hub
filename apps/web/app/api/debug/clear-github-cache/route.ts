import { logger } from '@thedaviddias/logging'
import { NextResponse } from 'next/server'
import { GitHubAPIClient } from '@/lib/github-security-utils'

/**
 * POST handler that clears the GitHub API rate-limit cache.
 *
 * Clears the singleton GitHubAPIClient's rate-limit cache and returns a JSON response
 * with a success message and ISO timestamp. On failure returns a JSON error object
 * including `details` and `timestamp` and an HTTP 500 status. The operation is logged.
 *
 * @returns NextResponse containing either `{ message, timestamp }` on success or
 * `{ error, details, timestamp }` with status 500 on failure.
 */
export async function POST() {
  try {
    const githubClient = GitHubAPIClient.getInstance()
    githubClient.clearRateLimitCache()

    logger.info('Debug: GitHub API cache cleared', {
      tags: { type: 'debug', component: 'github-cache' }
    })

    return NextResponse.json({
      message: 'GitHub API cache cleared successfully',
      timestamp: new Date().toISOString()
    })
  } catch (error) {
    logger.error('Debug: Error clearing GitHub API cache', {
      data: { error: error instanceof Error ? error.message : 'Unknown error' },
      tags: { type: 'debug', component: 'github-cache', error: 'clear-failed' }
    })

    return NextResponse.json(
      {
        error: 'Failed to clear GitHub API cache',
        details: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date().toISOString()
      },
      { status: 500 }
    )
  }
}
