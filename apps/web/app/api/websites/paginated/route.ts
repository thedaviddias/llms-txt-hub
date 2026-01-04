import { logger } from '@thedaviddias/logging'
import { NextResponse } from 'next/server'
import { getWebsites } from '@/lib/content-loader'

interface PaginatedWebsitesResponse {
  websites: Array<{
    slug: string
    name: string
    description: string
    website: string
    category: string
    publishedAt: string
    isUnofficial?: boolean
  }>
  totalCount: number
  page: number
  totalPages: number
  hasMore: boolean
}

/**
 * API endpoint for paginated website loading
 * Used for Load More pattern - loads 48 websites at a time by default
 */
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const page = Math.max(1, Number.parseInt(searchParams.get('page') || '1', 10))
    const limit = Math.min(
      100,
      Math.max(10, Number.parseInt(searchParams.get('limit') || '48', 10))
    )
    const offset = Number.parseInt(searchParams.get('offset') || '0', 10)

    const allWebsites = await getWebsites()
    const totalCount = allWebsites.length

    // Calculate pagination
    const startIndex = offset || (page - 1) * limit
    const endIndex = startIndex + limit
    const websites = allWebsites.slice(startIndex, endIndex)

    const totalPages = Math.ceil(totalCount / limit)
    const hasMore = endIndex < totalCount

    const response: PaginatedWebsitesResponse = {
      websites: websites.map(website => ({
        slug: website.slug,
        name: website.name,
        description: website.description,
        website: website.website,
        category: website.category,
        publishedAt: website.publishedAt,
        isUnofficial: website.isUnofficial
      })),
      totalCount,
      page,
      totalPages,
      hasMore
    }

    return NextResponse.json(response)
  } catch (error) {
    logger.error('Error fetching paginated websites', {
      data: error,
      tags: { api: 'websites-paginated' }
    })
    return NextResponse.json({ error: 'Failed to fetch websites' }, { status: 500 })
  }
}
