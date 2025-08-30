import { createClerkClient } from '@clerk/backend'
import { auth } from '@thedaviddias/auth'
import { logger } from '@thedaviddias/logging'
import DOMPurify from 'isomorphic-dompurify'
import { NextResponse } from 'next/server'

const clerk = createClerkClient({
  secretKey: process.env.CLERK_SECRET_KEY!
})

// Simple in-memory rate limiting for username checks
const rateLimitMap = new Map<string, { count: number; resetTime: number }>()

function checkRateLimit(userId: string): { allowed: boolean; resetTime?: number } {
  const now = Date.now()
  const windowMs = 60 * 1000 // 1 minute window
  const maxRequests = 20 // Max 20 username checks per minute per user

  const userLimit = rateLimitMap.get(userId)

  if (!userLimit || now > userLimit.resetTime) {
    // Reset or initialize
    rateLimitMap.set(userId, { count: 1, resetTime: now + windowMs })
    return { allowed: true }
  }

  if (userLimit.count >= maxRequests) {
    return { allowed: false, resetTime: userLimit.resetTime }
  }

  userLimit.count++
  return { allowed: true }
}

export async function POST(request: Request) {
  try {
    // Get the current user session
    const session = await auth()

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Check rate limit
    const rateLimit = checkRateLimit(session.user.id)
    if (!rateLimit.allowed) {
      return NextResponse.json(
        { error: 'Too many requests. Please try again later.' },
        { status: 429 }
      )
    }

    // Parse and validate request body
    const body = await request.json()
    const { username } = body

    if (!username || typeof username !== 'string') {
      return NextResponse.json({ error: 'Username is required' }, { status: 400 })
    }

    // Sanitize username input
    const sanitizedUsername = DOMPurify.sanitize(username, {
      ALLOWED_TAGS: [],
      ALLOWED_ATTR: [],
      KEEP_CONTENT: true
    })

    const trimmedUsername = sanitizedUsername.trim().toLowerCase()

    // Additional security checks
    if (trimmedUsername !== username.trim().toLowerCase()) {
      return NextResponse.json({ error: 'Invalid characters in username' }, { status: 400 })
    }

    // Validate username format (same as frontend validation)
    if (trimmedUsername.length < 3) {
      return NextResponse.json({
        available: false,
        error: 'Username must be at least 3 characters'
      })
    }

    if (trimmedUsername.length > 30) {
      return NextResponse.json({
        available: false,
        error: 'Username must be 30 characters or less'
      })
    }

    if (!/^[a-zA-Z0-9_-]+$/.test(trimmedUsername)) {
      return NextResponse.json({
        available: false,
        error: 'Username can only contain letters, numbers, underscores, and hyphens'
      })
    }

    // Get current user to allow checking their own username
    const currentUser = await clerk.users.getUser(session.user.id)

    // If it's the same as current username, it's available (no change)
    if (currentUser.username === trimmedUsername) {
      return NextResponse.json({ available: true })
    }

    // Check if username is taken by querying Clerk users
    try {
      const existingUsers = await clerk.users.getUserList({
        username: [trimmedUsername],
        limit: 1
      })

      const isAvailable = existingUsers.data.length === 0

      return NextResponse.json({ available: isAvailable })
    } catch (error) {
      // If there's an error with the query, assume username might be taken
      logger.error('Error checking username availability:', { data: error, tags: { type: 'api' } })
      return NextResponse.json({ available: false, error: 'Unable to check username availability' })
    }
  } catch (error) {
    logger.error('Error in check-username API:', {
      data: error instanceof Error ? { message: error.message, name: error.name } : 'Unknown error',
      tags: { type: 'api' }
    })
    return NextResponse.json({ error: 'Failed to check username' }, { status: 500 })
  }
}
