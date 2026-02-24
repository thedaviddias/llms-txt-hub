import { logger } from '@thedaviddias/logging'
import { withRateLimit } from '@thedaviddias/rate-limiting'
import { type NextRequest, NextResponse } from 'next/server'
import { getCachedMembers, type Member } from '@/lib/member-server-utils'
import { hasSharedInfo } from '@/lib/member-shared'

interface MembersResponse {
  members: Member[]
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
 * Reads from the two-tier cache (unstable_cache + Redis) instead of Clerk directly.
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

      const allMembers = (await getCachedMembers()).filter(hasSharedInfo)

      // Apply search filter if provided
      let filteredMembers = allMembers
      if (search) {
        const query = search.toLowerCase()
        filteredMembers = allMembers.filter(member => {
          const displayName =
            member.firstName && member.lastName
              ? `${member.firstName} ${member.lastName}`
              : member.firstName || member.lastName || ''
          const username = member.username || member.publicMetadata?.github_username || ''

          return displayName.toLowerCase().includes(query) || username.toLowerCase().includes(query)
        })
      }

      // Calculate pagination
      const totalCount = filteredMembers.length
      const totalPages = Math.ceil(totalCount / limit)
      const offset = (page - 1) * limit
      const members = filteredMembers.slice(offset, offset + limit)
      const hasMore = page < totalPages

      return NextResponse.json({
        members,
        pagination: {
          page,
          limit,
          total: totalCount,
          totalPages,
          hasMore
        }
      })
    } catch (error) {
      const errorInfo: Record<string, unknown> =
        error instanceof Error
          ? { message: error.message, name: error.name }
          : { message: 'Unknown error occurred' }

      if (error && typeof error === 'object') {
        if ('status' in error && error.status) {
          errorInfo.status = error.status
        }
      }

      logger.error('Error fetching members:', {
        data: errorInfo,
        tags: { type: 'api' }
      })
      return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
    }
  })
}
