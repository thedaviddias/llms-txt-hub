import { auth, clerkClient } from '@clerk/nextjs/server'
import { logger } from '@thedaviddias/logging'
import DOMPurify from 'isomorphic-dompurify'
import { type NextRequest, NextResponse } from 'next/server'

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
  } catch (error) {
    logger.error('Failed to get user favorites', { data: error, tags: { api: 'favorites' } })
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const { userId } = await auth()

    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
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
      const sanitized = DOMPurify.sanitize(favorite, {
        ALLOWED_TAGS: [],
        ALLOWED_ATTR: [],
        KEEP_CONTENT: true
      })

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
