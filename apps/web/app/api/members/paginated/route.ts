import { logger } from '@thedaviddias/logging'
import { NextResponse } from 'next/server'
import { getCachedMembers } from '@/lib/member-server-utils'

interface PaginatedMembersResponse {
  members: Array<{
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
    hasContributions?: boolean
  }>
  totalCount: number
  page: number
  totalPages: number
  hasMore: boolean
}

/**
 * API endpoint for paginated member loading with search
 * Loads members in pages with optional search functionality
 */
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const page = Math.max(1, Number.parseInt(searchParams.get('page') || '1', 10))
    const limit = Math.min(
      50,
      Math.max(10, Number.parseInt(searchParams.get('limit') || '24', 10))
    )
    const search = searchParams.get('search') || ''

    // Get all members from cache
    const allMembers = await getCachedMembers()
    const totalCount = allMembers.length

    // Apply search filter if provided
    let filteredMembers = allMembers
    if (search.trim()) {
      const searchLower = search.toLowerCase().trim()
      filteredMembers = allMembers.filter(member => {
        const displayName =
          member.firstName && member.lastName
            ? `${member.firstName} ${member.lastName}`.toLowerCase()
            : (member.firstName || member.lastName || member.username || '').toLowerCase()
        const username = (
          member.username ||
          member.publicMetadata?.github_username ||
          ''
        ).toLowerCase()

        return displayName.includes(searchLower) || username.includes(searchLower)
      })
    }

    // Calculate pagination
    const totalPages = Math.ceil(filteredMembers.length / limit)
    const startIndex = (page - 1) * limit
    const endIndex = startIndex + limit
    const members = filteredMembers.slice(startIndex, endIndex)

    const hasMore = endIndex < filteredMembers.length

    const response: PaginatedMembersResponse = {
      members: members.map(member => ({
        id: member.id,
        firstName: member.firstName,
        lastName: member.lastName,
        username: member.username,
        imageUrl: member.imageUrl,
        createdAt: member.createdAt,
        publicMetadata: {
          github_username: member.publicMetadata?.github_username || null,
          migrated_from: member.publicMetadata?.migrated_from || null
        },
        hasContributions: member.hasContributions
      })),
      totalCount: filteredMembers.length,
      page,
      totalPages,
      hasMore
    }

    return NextResponse.json(response)
  } catch (error) {
    logger.error('Error fetching paginated members', {
      data: error,
      tags: { api: 'members-paginated' }
    })
    return NextResponse.json({ error: 'Failed to fetch members' }, { status: 500 })
  }
}
