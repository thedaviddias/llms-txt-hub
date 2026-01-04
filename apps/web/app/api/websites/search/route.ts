import { logger } from '@thedaviddias/logging'
import { NextResponse } from 'next/server'
import { getWebsites } from '@/lib/content-loader'

interface SearchWebsitesResponse {
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
  query: string
}

/**
 * API endpoint for searching all websites
 * Searches across all 887+ websites regardless of what's loaded on the page
 * Supports search by name, description, and category
 */
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const query = searchParams.get('q')?.trim() || ''
    const limit = Math.min(
      200,
      Math.max(10, Number.parseInt(searchParams.get('limit') || '100', 10))
    )

    if (!query) {
      return NextResponse.json({
        websites: [],
        totalCount: 0,
        query: ''
      } as SearchWebsitesResponse)
    }

    const allWebsites = await getWebsites()
    const searchQuery = query.toLowerCase()

    // Search across name, description, and category
    const matchingWebsites = allWebsites.filter(website => {
      return (
        website.name.toLowerCase().includes(searchQuery) ||
        website.description.toLowerCase().includes(searchQuery) ||
        website.category.toLowerCase().includes(searchQuery)
      )
    })

    // Sort by relevance (exact name matches first, then description matches)
    const sortedWebsites = matchingWebsites.sort((a, b) => {
      const aNameMatch = a.name.toLowerCase().includes(searchQuery)
      const bNameMatch = b.name.toLowerCase().includes(searchQuery)

      if (aNameMatch && !bNameMatch) return -1
      if (!aNameMatch && bNameMatch) return 1

      // If both or neither match by name, sort by published date (newest first)
      return new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime()
    })

    // Apply limit
    const limitedWebsites = sortedWebsites.slice(0, limit)

    const response: SearchWebsitesResponse = {
      websites: limitedWebsites.map(website => ({
        slug: website.slug,
        name: website.name,
        description: website.description,
        website: website.website,
        category: website.category,
        publishedAt: website.publishedAt,
        isUnofficial: website.isUnofficial
      })),
      totalCount: matchingWebsites.length,
      query
    }

    return NextResponse.json(response)
  } catch (error) {
    logger.error('Error searching websites', {
      data: error,
      tags: { api: 'websites-search' }
    })
    return NextResponse.json({ error: 'Failed to search websites' }, { status: 500 })
  }
}
