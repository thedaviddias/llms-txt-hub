import { auth, clerkClient } from '@clerk/nextjs/server'
import { logger } from '@thedaviddias/logging'
import { type NextRequest, NextResponse } from 'next/server'
import { stripHtml } from '@/lib/security-utils-helpers'

/**
 * Handle GET request to retrieve the current user's favorites
 */
export async function GET() {
  try {
    const { userId } = await auth()

    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const client = await clerkClient()
    const user = await client.users.getUser(userId)
    const favorites = (user.privateMetadata?.favorites as string[]) || []

    return NextResponse.json({ favorites })
  } catch (error: unknown) {
    // Handle deleted user (stale session token still valid after account deletion)
    if (error && typeof error === 'object' && 'status' in error && error.status === 404) {
      return NextResponse.json({ favorites: [] })
    }
    logger.error('Failed to get user favorites', { data: error, tags: { api: 'favorites' } })
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}

/**
 * Handle POST request to update the current user's favorites
 */
export async function POST(request: NextRequest) {
  try {
    const { userId } = await auth()

    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    let body: { favorites?: unknown }
    try {
      body = await request.json()
    } catch {
      return NextResponse.json({ error: 'Invalid request body' }, { status: 400 })
    }
    const { favorites } = body

    // Enhanced input validation
    if (!Array.isArray(favorites)) {
      return NextResponse.json({ error: 'Invalid favorites format' }, { status: 400 })
    }

    // Validate each favorite item
    const sanitizedFavorites = favorites.map(favorite => {
      if (typeof favorite !== 'string') {
        throw new Error('Invalid favorite format')
      }

      // Sanitize the favorite string
      const sanitized = stripHtml(favorite)

      // Additional validation - ensure it's a reasonable favorite ID
      if (sanitized.length > 100 || sanitized.length < 1) {
        throw new Error('Invalid favorite length')
      }

      return sanitized.trim()
    })

    // Limit number of favorites to prevent abuse
    if (sanitizedFavorites.length > 1000) {
      return NextResponse.json({ error: 'Too many favorites' }, { status: 400 })
    }

    const client = await clerkClient()
    await client.users.updateUserMetadata(userId, {
      privateMetadata: {
        favorites: sanitizedFavorites
      }
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    logger.error('Failed to update user favorites', { data: error, tags: { api: 'favorites' } })
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}
