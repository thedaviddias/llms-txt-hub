import { auth, clerkClient } from '@clerk/nextjs/server'
import { type NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
  try {
    const { userId } = await auth()

    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { authLevel, canSubmitPR, githubConnected } = body

    const client = await clerkClient()

    // Update user's public metadata
    await client.users.updateUserMetadata(userId, {
      publicMetadata: {
        authLevel: authLevel || 'email_only',
        canSubmitPR: canSubmitPR || false,
        githubConnected: githubConnected || false,
        lastUpdated: new Date().toISOString()
      }
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error updating user metadata:', error)
    return NextResponse.json({ error: 'Failed to update metadata' }, { status: 500 })
  }
}
