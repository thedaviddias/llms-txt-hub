import { type NextRequest, NextResponse } from 'next/server'
import { getUserContributions } from '@/lib/github-contributions'
import { logger } from '@thedaviddias/logging'

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const username = searchParams.get('username')

  if (!username) {
    return NextResponse.json({ error: 'Username parameter required' }, { status: 400 })
  }

  try {
    logger.info('Debug: Fetching GitHub contributions', {
      data: { username },
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
      data: { username, error: error instanceof Error ? error.message : 'Unknown error' },
      tags: { type: 'debug', component: 'github-contributions', error: 'fetch-failed' }
    })

    return NextResponse.json(
      {
        error: 'Failed to fetch contributions',
        details: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date().toISOString()
      },
      { status: 500 }
    )
  }
}
