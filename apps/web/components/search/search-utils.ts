/**
 * Utility functions for search functionality
 */

import { logger } from '@thedaviddias/logging'

export interface WebsiteMetadata {
  slug: string
  website: string
  name: string
  description: string
  categories: string[]
  tags: string[]
  llmsUrl: string
  llmsFullUrl: string
  category: string
  publishedAt: string
}

export interface SearchIndexEntry {
  url?: string
  title?: string
  description?: string
  category?: string
  categories?: string[]
  tags?: string[]
  tag?: string
  name?: string
  slug?: string
  website?: string
  llmsUrl?: string
  llmsFullUrl?: string
  publishedAt?: string
}

/**
 * Check if an entry can be transformed to WebsiteMetadata
 *
 * @param entry - Search index entry
 * @returns Whether the entry can be transformed
 */
export function canTransformToWebsiteMetadata(entry: SearchIndexEntry): boolean {
  try {
    if (!entry) return false

    // Explicitly exclude .DS_Store entries
    if (entry.slug?.includes('.DS_Store') || entry.url?.includes('.DS_Store')) {
      return false
    }

    // Must have at least a URL or website
    if (!entry.url && !entry.website) return false

    // Must have some content (title, name, or description)
    if (!entry.title && !entry.name && !entry.description) return false

    return true
  } catch (error) {
    logger.error('Error checking entry validity:', {
      data: { error, entry },
      tags: { type: 'component' }
    })
    return false
  }
}

/**
 * Transform a search index entry to WebsiteMetadata
 *
 * @param entry - Search index entry
 * @returns Transformed website metadata
 */
export function transformToWebsiteMetadata(entry: SearchIndexEntry): WebsiteMetadata {
  try {
    // Generate a slug from URL if not available
    let slug = entry.slug
    if (!slug && entry.url) {
      slug = entry.url
        .replace(/https?:\/\//, '')
        .replace(/[^a-zA-Z0-9-]/g, '-')
        .toLowerCase()
    }

    const website = entry.website || entry.url || ''
    const name = entry.name || entry.title || 'Untitled'
    const description = entry.description || ''
    const categories = entry.categories || (entry.category ? [entry.category] : [])
    const tags = entry.tags || (entry.tag ? [entry.tag] : [])

    return {
      slug: slug || '',
      website,
      name,
      description,
      categories,
      tags,
      llmsUrl: entry.llmsUrl || '',
      llmsFullUrl: entry.llmsFullUrl || '',
      category: categories[0] || '',
      publishedAt: entry.publishedAt || ''
    }
  } catch (error) {
    logger.error('Error transforming entry:', {
      data: { error, entry },
      tags: { type: 'component' }
    })

    // Return a safe fallback
    return {
      slug: '',
      website: '',
      name: 'Unknown',
      description: '',
      categories: [],
      tags: [],
      llmsUrl: '',
      llmsFullUrl: '',
      category: '',
      publishedAt: ''
    }
  }
}

/**
 * Check if an entry matches a search query
 *
 * @param entry - Search index entry
 * @param query - Search query
 * @returns Whether entry matches the query
 */
export function matchesSearchQuery(entry: SearchIndexEntry, query: string): boolean {
  try {
    if (!entry || !query) return false

    // Normalize the query
    const searchTerms = query.toLowerCase().trim().split(/\s+/)

    // Fields to search in
    const searchableFields = [
      entry.title?.toLowerCase(),
      entry.name?.toLowerCase(),
      entry.description?.toLowerCase(),
      entry.category?.toLowerCase(),
      entry.website?.toLowerCase(),
      entry.url?.toLowerCase(),
      ...(entry.tags || []).map(tag => tag.toLowerCase()),
      ...(entry.categories || []).map(cat => cat.toLowerCase())
    ].filter(Boolean)

    // Check if all search terms match at least one field
    return searchTerms.every(term => searchableFields.some(field => field?.includes(term)))
  } catch (error) {
    logger.error('Error matching query:', {
      data: { error, entry, query },
      tags: { type: 'component' }
    })
    return false
  }
}
