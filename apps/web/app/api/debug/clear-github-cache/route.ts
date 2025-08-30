import { GitHubAPIClient } from '@/lib/github-security-utils'
import { logger } from '@thedaviddias/logging'
import { NextResponse } from 'next/server'

/**
 * POST handler for clearing GitHub API cache
 * 
 * @returns Promise resolving to NextResponse with success or error message
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
