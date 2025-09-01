import { logger } from '@thedaviddias/logging'
import { type NextRequest, NextResponse } from 'next/server'
import { getClerk } from '@/lib/clerk'
import { withRateLimit } from '@/lib/rate-limiter'

/**
 * Determines if a user has shared enough information to be displayed publicly
 * @param user - Clerk user object to check
 * @returns true if user should be displayed, false if profile is private
 */
function hasSharedInfo(user: any): boolean {
  // Only exclude users who explicitly set their profile to private
  if (user.publicMetadata?.isProfilePrivate === true) {
    return false
  }

  // Include all other users (even GitHub users without names in their profile)
  // They will be shown as "User XXXXX" or with their GitHub username
  return true
}

interface MemberData {
  id: string
  firstName?: string | null
  lastName?: string | null
  username?: string | null
  imageUrl?: string | null
  createdAt: string
  publicMetadata?: {
    github_username?: string | null
    migrated_from?: string | null
  }
}

interface MembersResponse {
  members: MemberData[]
  pagination: {
    page: number
    limit: number
    total: number
    totalPages: number
    hasMore: boolean
  }
}

/**
 * GET /api/members - Retrieves paginated list of community members
 * @param request - Next.js request object with query parameters (page, limit, search, filter)
 * @returns Promise resolving to NextResponse with members data and pagination info
 */
export async function GET(
  request: NextRequest
): Promise<NextResponse<MembersResponse | { error: string }> | Response> {
  return await withRateLimit(request, 'MEMBERS_API', async () => {
    try {
      const { searchParams } = new URL(request.url)
      const page = Math.max(1, Number.parseInt(searchParams.get('page') || '1', 10) || 1)
      const parsedLimit = Number.parseInt(searchParams.get('limit') || '20', 10)
      const limit = Math.min(50, Math.max(1, Number.isNaN(parsedLimit) ? 20 : parsedLimit))
      const search = searchParams.get('search')?.trim()
      const filter = searchParams.get('filter') // 'contributors', 'community', or null

      // Fetch users from Clerk with pagination
      const offset = (page - 1) * limit

      logger.info('Fetching members from Clerk:', {
        data: { page, limit, offset, search, filter },
        tags: { type: 'api' }
      })

      // Check if Clerk is properly configured
      if (!process.env.CLERK_SECRET_KEY) {
        logger.warn('CLERK_SECRET_KEY not configured, using fallback data', {
          tags: { type: 'api' }
        })

        // Fallback to mock data if Clerk is not configured (deterministic values for E2E)
        const mockMembers: MemberData[] = Array.from({ length: limit }, (_, i) => {
          const id = `demo-user-${page}-${i + 1}`
          const globalIndex = page * limit + i

          // Deterministic date: subtract (globalIndex % 365) days from now
          const daysOffset = globalIndex % 365
          const createdAt = new Date(Date.now() - daysOffset * 24 * 60 * 60 * 1000).toISOString()

          // Deterministic github_username: even global indices get github username
          const github_username = globalIndex % 2 === 0 ? `github-demo${globalIndex + 1}` : null

          return {
            id,
            firstName: 'Demo User',
            lastName: `${globalIndex + 1}`,
            username: `demo_user_${globalIndex + 1}`,
            imageUrl: `https://api.dicebear.com/7.x/avataaars/svg?seed=${id}`,
            createdAt,
            publicMetadata: {
              github_username,
              migrated_from: null
            }
          }
        })

        const totalCount = 150 // Demo total showing pagination works
        const members = mockMembers

        // Apply search filter if provided
        let filteredMembers = members
        if (search) {
          const query = search.toLowerCase()
          filteredMembers = members.filter(member => {
            const displayName =
              member.firstName && member.lastName
                ? `${member.firstName} ${member.lastName}`
                : member.firstName || member.lastName || ''
            const username = member.username || member.publicMetadata?.github_username || ''

            return (
              displayName.toLowerCase().includes(query) || username.toLowerCase().includes(query)
            )
          })
        }

        // Calculate pagination metadata
        const totalPages = Math.ceil(totalCount / limit)
        const hasMore = page < totalPages

        const paginationData = {
          page,
          limit,
          total: totalCount,
          totalPages,
          hasMore
        }

        return NextResponse.json({
          members: filteredMembers,
          pagination: paginationData
        })
      }

      // Get shared Clerk client instance
      const clerk = getClerk()

      if (!clerk) {
        logger.warn('Clerk client not available in members API route')
        return NextResponse.json({ error: 'Authentication service unavailable' }, { status: 503 })
      }

      let clerkResponse
      try {
        clerkResponse = await clerk.users.getUserList({
          limit: limit * 2, // Get more users to account for filtering
          offset,
          orderBy: '-created_at'
        })

        logger.info('Successfully fetched from Clerk:', {
          data: { userCount: clerkResponse.data.length, page, limit },
          tags: { type: 'api' }
        })
      } catch (clerkError) {
        logger.error('Error fetching from Clerk:', {
          data: {
            error: clerkError instanceof Error ? clerkError.message : 'Unknown Clerk error',
            page,
            limit,
            offset
          },
          tags: { type: 'api' }
        })

        // Fallback to mock data if Clerk fails (deterministic values for E2E)
        const mockMembers: MemberData[] = Array.from({ length: limit }, (_, i) => {
          const id = `fallback-user-${page}-${i + 1}`
          const globalIndex = page * limit + i

          // Deterministic date: subtract (globalIndex % 365) days from now
          const daysOffset = globalIndex % 365
          const createdAt = new Date(Date.now() - daysOffset * 24 * 60 * 60 * 1000).toISOString()

          // Deterministic github_username: even global indices get github username
          const github_username = globalIndex % 2 === 0 ? `github-user${globalIndex + 1}` : null

          return {
            id,
            firstName: 'User',
            lastName: `${globalIndex + 1}`,
            username: `user${globalIndex + 1}`,
            imageUrl: `https://api.dicebear.com/7.x/avataaars/svg?seed=${id}`,
            createdAt,
            publicMetadata: {
              github_username,
              migrated_from: null
            }
          }
        })

        const totalCount = 50 // Fallback total
        const members = mockMembers

        // Apply search filter if provided
        let filteredMembers = members
        if (search) {
          const query = search.toLowerCase()
          filteredMembers = members.filter(member => {
            const displayName =
              member.firstName && member.lastName
                ? `${member.firstName} ${member.lastName}`
                : member.firstName || member.lastName || ''
            const username = member.username || member.publicMetadata?.github_username || ''

            return (
              displayName.toLowerCase().includes(query) || username.toLowerCase().includes(query)
            )
          })
        }

        // Calculate pagination metadata
        const totalPages = Math.ceil(totalCount / limit)
        const hasMore = page < totalPages

        const paginationData = {
          page,
          limit,
          total: totalCount,
          totalPages,
          hasMore
        }

        return NextResponse.json({
          members: filteredMembers,
          pagination: paginationData
        })
      }

      // Filter to only include users with shared info
      const validUsers = clerkResponse.data.filter(hasSharedInfo)

      // Convert Clerk users to our MemberData format
      const members: MemberData[] = validUsers.slice(0, limit).map(user => ({
        id: user.id,
        firstName: user.firstName,
        lastName: user.lastName,
        username: user.username,
        imageUrl: user.imageUrl,
        createdAt: user.createdAt
          ? new Date(user.createdAt).toISOString()
          : new Date().toISOString(),
        publicMetadata: {
          github_username: (user.publicMetadata?.github_username as string) || null,
          migrated_from: (user.publicMetadata?.migrated_from as string) || null
        }
      }))

      // For total count, we need to make another request to get all users and count them
      // This is not ideal but Clerk doesn't provide a count endpoint
      // TODO: Consider caching this or using a database table to track member counts
      const totalCount = validUsers.length

      // Apply search filter if provided
      let filteredMembers = members
      if (search) {
        const query = search.toLowerCase()
        filteredMembers = members.filter(member => {
          const displayName =
            member.firstName && member.lastName
              ? `${member.firstName} ${member.lastName}`
              : member.firstName || member.lastName || ''
          const username = member.username || member.publicMetadata?.github_username || ''

          return displayName.toLowerCase().includes(query) || username.toLowerCase().includes(query)
        })
      }

      // Calculate pagination metadata
      const totalPages = Math.ceil(totalCount / limit)
      const hasMore = page < totalPages

      const paginationData = {
        page,
        limit,
        total: totalCount,
        totalPages,
        hasMore
      }

      return NextResponse.json({
        members: filteredMembers,
        pagination: paginationData
      })
    } catch (error) {
      // Log sanitized error information without raw Error object
      const errorInfo: Record<string, unknown> =
        error instanceof Error
          ? {
              message: error.message,
              name: error.name
            }
          : { message: 'Unknown error occurred' }

      // Add optional error properties if they exist
      if (error && typeof error === 'object') {
        if ('status' in error && error.status) {
          errorInfo.status = error.status
        }
        if ('code' in error && error.code) {
          errorInfo.code = error.code
        }
      }

      logger.error('Error fetching paginated members:', {
        data: errorInfo,
        tags: { type: 'api' }
      })
      return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
    }
  })
}
