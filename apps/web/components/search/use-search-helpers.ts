/**
 * Helper functions for the search hook to reduce complexity
 */

import type { SearchIndexEntry, WebsiteMetadata } from '@/components/search/search-utils'
import {
  canTransformToWebsiteMetadata,
  matchesSearchQuery,
  transformToWebsiteMetadata
} from '@/components/search/search-utils'
import { logger } from '@thedaviddias/logging'

/**
 * Filter and sort entries by relevance to query
 *
 * @param entries - Search index entries
 * @param query - Search query
 * @returns Filtered and sorted entries
 */
export function filterAndSortEntries(
  entries: SearchIndexEntry[],
  query: string
): SearchIndexEntry[] {
  const queryLower = query.toLowerCase()

  return entries
    .filter(entry => {
      try {
        return matchesSearchQuery(entry, query)
      } catch (matchError) {
        logger.error('Error matching entry:', {
          data: { matchError, entry },
          tags: { type: 'component' }
        })
        return false
      }
    })
    .sort((a, b) => {
      const aTitle = (a.name || a.title || '').toLowerCase()
      const bTitle = (b.name || b.title || '').toLowerCase()

      // Exact title matches first
      if (aTitle === queryLower && bTitle !== queryLower) return -1
      if (bTitle === queryLower && aTitle !== queryLower) return 1

      // Title starts with query
      if (aTitle.startsWith(queryLower) && !bTitle.startsWith(queryLower)) return -1
      if (bTitle.startsWith(queryLower) && !aTitle.startsWith(queryLower)) return 1

      // Title contains query
      if (aTitle.includes(queryLower) && !bTitle.includes(queryLower)) return -1
      if (bTitle.includes(queryLower) && !aTitle.includes(queryLower)) return 1

      // Alphabetical fallback
      return aTitle.localeCompare(bTitle)
    })
}

/**
 * Validate entries safely
 *
 * @param entries - Entries to validate
 * @returns Valid entries
 */
export function validateEntries(entries: SearchIndexEntry[]): SearchIndexEntry[] {
  return entries.filter(entry => {
    try {
      return canTransformToWebsiteMetadata(entry)
    } catch (validationError) {
      logger.error('Error validating entry:', {
        data: { validationError, entry },
        tags: { type: 'component' }
      })
      return false
    }
  })
}

/**
 * Transform entries to website metadata and sanitize URLs
 *
 * @param entries - Valid entries
 * @returns Transformed and sanitized website metadata
 */
export function transformAndSanitizeEntries(entries: SearchIndexEntry[]): WebsiteMetadata[] {
  return entries
    .map(entry => {
      try {
        return transformToWebsiteMetadata(entry)
      } catch (transformError) {
        logger.error('Error transforming entry:', {
          data: { transformError, entry },
          tags: { type: 'component' }
        })
        return {
          slug: 'error',
          name: 'Error processing result',
          description: '',
          website: '#',
          llmsUrl: '#',
          llmsFullUrl: '',
          category: '',
          publishedAt: '',
          categories: [],
          tags: []
        }
      }
    })
    .map(result => {
      if (!result.website || result.website === '#') {
        return result
      }

      try {
        new URL(result.website.startsWith('http') ? result.website : `https://${result.website}`)
        return result
      } catch {
        return {
          ...result,
          website: '#'
        }
      }
    })
}

/**
 * Try lenient processing as fallback for when no strict results are found
 *
 * @param entries - Filtered entries
 * @returns Processed results or empty array
 */
export function tryLenientProcessing(entries: SearchIndexEntry[]): WebsiteMetadata[] {
  try {
    return entries
      .map(entry => {
        try {
          return transformToWebsiteMetadata(entry)
        } catch {
          return null
        }
      })
      .filter((item): item is WebsiteMetadata => item !== null && item !== undefined)
  } catch (lenientError) {
    logger.error('Error during lenient processing:', {
      data: lenientError,
      tags: { type: 'component' }
    })
    return []
  }
}
