import { createClerkClient } from '@clerk/backend'
import { auth } from '@thedaviddias/auth'
import { logger } from '@thedaviddias/logging'
import { NextResponse } from 'next/server'

const clerk = createClerkClient({
  secretKey: process.env.CLERK_SECRET_KEY!
})

export async function DELETE() {
  try {
    // Get the current user session
    const session = await auth()

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Delete the user from Clerk
    await clerk.users.deleteUser(session.user.id)

    // Note: The signOut will be handled on the client side after this succeeds
    // Clerk will automatically invalidate all sessions for the deleted user

    return NextResponse.json({
      success: true,
      message: 'Account deleted successfully'
    })
  } catch (error) {
    logger.error('Error deleting user account:', { data: error, tags: { type: 'api' } })

    // Check if the error is because user is already deleted
    if (error instanceof Error && error.message.includes('not found')) {
      return NextResponse.json({
        success: true,
        message: 'Account already deleted'
      })
    }

    return NextResponse.json(
      { error: 'Failed to delete account. Please contact support.' },
      { status: 500 }
    )
  }
}
