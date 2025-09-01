import { GitHubAPIClient } from '@/lib/github-security-utils'
import { logger } from '@thedaviddias/logging'
import { NextResponse } from 'next/server'

/**
 * GET handler for GitHub rate limit debugging
 *
 * @returns Promise resolving to NextResponse with rate limit info or error
 */
export async function GET() {
  try {
    const _githubClient = GitHubAPIClient.getInstance()

    // Make a simple request to check rate limit
    const response = await fetch('https://api.github.com/rate_limit', {
      headers: {
        Accept: 'application/vnd.github.v3+json',
        ...(process.env.GITHUB_TOKEN && {
          Authorization: `Bearer ${process.env.GITHUB_TOKEN}`
        })
      }
    })

    if (!response.ok) {
      return NextResponse.json(
        {
          error: 'Failed to fetch rate limit info',
          status: response.status,
          statusText: response.statusText
        },
        { status: 500 }
      )
    }

    const rateLimitData = await response.json()

    return NextResponse.json({
      rateLimit: rateLimitData,
      timestamp: new Date().toISOString()
    })
  } catch (error) {
    logger.error('Debug: Error fetching rate limit info', {
      data: { error: error instanceof Error ? error.message : 'Unknown error' },
      tags: { type: 'debug', component: 'rate-limit', error: 'fetch-failed' }
    })

    return NextResponse.json(
      {
        error: 'Failed to fetch rate limit info',
        details: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date().toISOString()
      },
      { status: 500 }
    )
  }
}
