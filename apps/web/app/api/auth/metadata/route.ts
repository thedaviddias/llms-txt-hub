import { auth, clerkClient } from '@clerk/nextjs/server'
import { logger } from '@thedaviddias/logging'
import { type NextRequest, NextResponse } from 'next/server'

/**
 * Handle POST request to sync user metadata from auth provider
 */
export async function POST(request: NextRequest) {
  try {
    const { userId } = await auth()

    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { authLevel, canSubmitPR, githubConnected } = body

    // Update user's public metadata
    const client = await clerkClient()
    await client.users.updateUserMetadata(userId, {
      publicMetadata: {
        authLevel: authLevel ?? 'email_only',
        canSubmitPR: canSubmitPR ?? false,
        githubConnected: githubConnected ?? false,
        lastUpdated: new Date().toISOString()
      }
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    logger.error(error instanceof Error ? error : new Error(String(error)), {
      data: error,
      tags: { type: 'api', route: 'auth/metadata' }
    })
    return NextResponse.json({ error: 'Failed to update metadata' }, { status: 500 })
  }
}
