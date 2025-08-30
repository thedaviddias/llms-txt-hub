import { createClerkClient } from '@clerk/backend'
import { auth } from '@thedaviddias/auth'
import { logger } from '@thedaviddias/logging'
import DOMPurify from 'isomorphic-dompurify'
import { NextResponse } from 'next/server'
import validator from 'validator'

const clerk = createClerkClient({
  secretKey: process.env.CLERK_SECRET_KEY!
})

// Validation limits
const LIMITS = {
  bio: 160,
  work: 100,
  website: 100,
  linkedin: 100,
  firstName: 50,
  lastName: 50,
  username: 30
}

/**
 * Sanitize text input to prevent XSS attacks
 * @param input - The input string to sanitize
 * @returns Sanitized string or null
 */
function sanitizeText(input: string | null | undefined): string | null {
  if (!input) return null

  // Use DOMPurify to remove all HTML and potentially dangerous content
  const cleaned = DOMPurify.sanitize(input, {
    ALLOWED_TAGS: [], // No HTML tags allowed
    ALLOWED_ATTR: [],
    KEEP_CONTENT: true // Keep text content
  })

  // Additional sanitization: remove zero-width characters and normalize whitespace
  return cleaned
    .replace(/\u200B|\u200C|\u200D|\uFEFF/g, '') // Remove zero-width characters
    .replace(/\s+/g, ' ') // Normalize whitespace
    .trim()
}

/**
 * Validate and sanitize URL input
 * @param url - The URL string to sanitize
 * @returns Sanitized URL string or null
 */
function sanitizeUrl(url: string | null | undefined): string | null {
  if (!url) return null

  const trimmed = url.trim()

  // Validate URL format
  if (
    !validator.isURL(trimmed, {
      protocols: ['http', 'https'],
      require_protocol: true,
      require_valid_protocol: true,
      allow_query_components: true,
      allow_fragments: true
    })
  ) {
    throw new Error('Invalid URL format')
  }

  // Additional check for malicious URLs
  const lowerUrl = trimmed.toLowerCase()
  if (lowerUrl.includes('javascript:') || lowerUrl.includes('data:')) {
    throw new Error('Invalid URL protocol')
  }

  return trimmed
}

/**
 * Handle POST request to update user metadata
 * @param request - The HTTP request object
 * @returns JSON response with success status or error
 */
export async function POST(request: Request) {
  try {
    // Get the current user session
    const session = await auth()

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Parse the request body
    const body = await request.json()
    const { isProfilePrivate, bio, work, website, linkedin, firstName, lastName, username } = body

    // Validate boolean if provided
    if (isProfilePrivate !== undefined && typeof isProfilePrivate !== 'boolean') {
      return NextResponse.json({ error: 'Invalid privacy setting' }, { status: 400 })
    }

    // Sanitize and validate bio
    const sanitizedBio = sanitizeText(bio)
    if (sanitizedBio && sanitizedBio.length > LIMITS.bio) {
      return NextResponse.json(
        { error: `Bio must be ${LIMITS.bio} characters or less` },
        { status: 400 }
      )
    }

    // Sanitize and validate work
    const sanitizedWork = sanitizeText(work)
    if (sanitizedWork && sanitizedWork.length > LIMITS.work) {
      return NextResponse.json(
        { error: `Work must be ${LIMITS.work} characters or less` },
        { status: 400 }
      )
    }

    // Sanitize and validate website URL
    let sanitizedWebsite: string | null = null
    try {
      sanitizedWebsite = sanitizeUrl(website)
      if (sanitizedWebsite && sanitizedWebsite.length > LIMITS.website) {
        return NextResponse.json(
          { error: `Website URL must be ${LIMITS.website} characters or less` },
          { status: 400 }
        )
      }
    } catch (_error) {
      return NextResponse.json(
        { error: 'Invalid website URL. Please use a valid http:// or https:// URL' },
        { status: 400 }
      )
    }

    // Sanitize and validate LinkedIn URL
    let sanitizedLinkedIn: string | null = null
    if (linkedin) {
      // Ensure it's a LinkedIn URL
      if (!linkedin.includes('linkedin.com/in/')) {
        return NextResponse.json(
          { error: 'Invalid LinkedIn URL. Must be a LinkedIn profile URL' },
          { status: 400 }
        )
      }
      try {
        // Add https:// if not present
        const linkedinUrl = linkedin.startsWith('http') ? linkedin : `https://${linkedin}`
        sanitizedLinkedIn = sanitizeUrl(linkedinUrl)
        if (sanitizedLinkedIn && sanitizedLinkedIn.length > LIMITS.linkedin) {
          return NextResponse.json(
            { error: `LinkedIn URL must be ${LIMITS.linkedin} characters or less` },
            { status: 400 }
          )
        }
      } catch (_error) {
        return NextResponse.json({ error: 'Invalid LinkedIn URL format' }, { status: 400 })
      }
    }

    // Sanitize and validate firstName
    const sanitizedFirstName = sanitizeText(firstName)
    if (sanitizedFirstName && sanitizedFirstName.length > LIMITS.firstName) {
      return NextResponse.json(
        { error: `First name must be ${LIMITS.firstName} characters or less` },
        { status: 400 }
      )
    }

    // Sanitize and validate lastName
    const sanitizedLastName = sanitizeText(lastName)
    if (sanitizedLastName && sanitizedLastName.length > LIMITS.lastName) {
      return NextResponse.json(
        { error: `Last name must be ${LIMITS.lastName} characters or less` },
        { status: 400 }
      )
    }

    // Validate username (handled separately as it updates user_metadata)
    // Check if username is provided (including empty string to remove it)
    if (username !== undefined) {
      const sanitizedUsername = sanitizeText(username)
      // Only validate if username is not empty (allow empty to remove username)
      if (sanitizedUsername && sanitizedUsername.length > 0) {
        if (sanitizedUsername.length < 3) {
          return NextResponse.json(
            { error: 'Username must be at least 3 characters' },
            { status: 400 }
          )
        }
        if (sanitizedUsername.length > LIMITS.username) {
          return NextResponse.json(
            { error: `Username must be ${LIMITS.username} characters or less` },
            { status: 400 }
          )
        }
        if (!/^[a-zA-Z0-9_-]+$/.test(sanitizedUsername)) {
          return NextResponse.json(
            { error: 'Username can only contain letters, numbers, underscores, and hyphens' },
            { status: 400 }
          )
        }
      }
    }

    // Get current user to preserve existing metadata
    const currentUser = await clerk.users.getUser(session.user.id)

    // Prepare update object
    const updateData: any = {
      publicMetadata: {
        ...currentUser.publicMetadata,
        bio: sanitizedBio,
        work: sanitizedWork,
        website: sanitizedWebsite,
        linkedin: sanitizedLinkedIn,
        firstName: sanitizedFirstName,
        lastName: sanitizedLastName
      }
    }

    // Only update isProfilePrivate if it was provided
    if (isProfilePrivate !== undefined) {
      updateData.publicMetadata.isProfilePrivate = isProfilePrivate
    }

    // Update username if provided (Clerk's top-level username field)
    // Handle both setting and removing username
    if (username !== undefined) {
      const sanitizedUsername = sanitizeText(username)
      // If empty string or null, remove username
      if (!sanitizedUsername || sanitizedUsername === '') {
        // Only update if currently has a username
        if (currentUser.username) {
          updateData.username = null
        }
      } else if (sanitizedUsername !== currentUser.username) {
        // Update with new username if different
        updateData.username = sanitizedUsername
      }
    }

    // Update firstName and lastName at the top level as well
    if (sanitizedFirstName !== undefined) {
      updateData.firstName = sanitizedFirstName
    }
    if (sanitizedLastName !== undefined) {
      updateData.lastName = sanitizedLastName
    }

    // Update the user's metadata using the backend API
    await clerk.users.updateUser(session.user.id, updateData)

    return NextResponse.json({ success: true })
  } catch (error) {
    logger.error('Error updating user metadata:', { data: error, tags: { type: 'api' } })
    return NextResponse.json({ error: 'Failed to update metadata' }, { status: 500 })
  }
}
