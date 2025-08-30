import { createHash } from 'node:crypto'
import { logger } from '@thedaviddias/logging'
import { type NextRequest, NextResponse } from 'next/server'
import { getUserContributions } from '@/lib/github-contributions'

/**
 * Creates a SHA-256 hash of the username for logging purposes
 *
 * @param username - The username to hash
 * @returns The hex digest of the username hash
 */
function hashUsername(username: string | null | undefined): string {
  const input = username || ''
  return createHash('sha256').update(input).digest('hex')
}

/**
 * HTTP GET handler that fetches a GitHub user's contribution data for debugging.
 *
 * Expects a `username` query parameter. Returns 400 if missing. On success returns a JSON
 * payload { username, contributions, timestamp }. On failure logs a hashed username and
 * returns a 500 JSON error response with `Cache-Control: no-store`. In non-production
 * environments the error response includes `details` with the underlying error message.
 *
 * The handler logs username information as a SHA-256 hex digest (not the raw username).
 *
 * @returns A NextResponse containing either the contributions payload or an error object.
 */
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const username = searchParams.get('username')

  if (!username) {
    return NextResponse.json({ error: 'Username parameter required' }, { status: 400 })
  }

  try {
    logger.info('Debug: Fetching GitHub contributions', {
      data: { usernameHash: hashUsername(username) },
      tags: { type: 'debug', component: 'github-contributions' }
    })

    const contributions = await getUserContributions(username)

    return NextResponse.json({
      username,
      contributions,
      timestamp: new Date().toISOString()
    })
  } catch (error) {
    logger.error('Debug: Error fetching GitHub contributions', {
      data: {
        usernameHash: hashUsername(username),
        error: error instanceof Error ? error.message : 'Unknown error'
      },
      tags: { type: 'debug', component: 'github-contributions', error: 'fetch-failed' }
    })

    const errorResponse: {
      error: string
      timestamp: string
      details?: string
    } = {
      error: 'Failed to fetch contributions',
      timestamp: new Date().toISOString()
    }

    // Only include error details in development
    if (process.env.NODE_ENV !== 'production') {
      errorResponse.details = error instanceof Error ? error.message : 'Unknown error'
    }

    return NextResponse.json(errorResponse, {
      status: 500,
      headers: {
        'Cache-Control': 'no-store'
      }
    })
  }
}
