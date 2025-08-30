/**
 * Custom hook for search functionality
 */

import { logger } from '@thedaviddias/logging'
import { useEffect, useState } from 'react'
import type { SearchIndexEntry, WebsiteMetadata } from '@/components/search/search-utils'
import {
  filterAndSortEntries,
  transformAndSanitizeEntries,
  tryLenientProcessing,
  validateEntries
} from '@/components/search/use-search-helpers'

/**
 * Custom hook to manage search functionality
 *
 * @param query - Search query string
 * @returns Object containing search results, loading state, and error
 */
export function useSearch(query: string) {
  const [results, setResults] = useState<WebsiteMetadata[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [searchIndex, setSearchIndex] = useState<SearchIndexEntry[]>([])
  const [indexLoaded, setIndexLoaded] = useState(false)

  // Load search index once on mount
  useEffect(() => {
    let isMounted = true

    /**
     * Load the search index from JSON file
     *
     * @returns Promise<void>
     */
    async function loadSearchIndex() {
      try {
        const response = await fetch('/search/search-index.json', {
          headers: {
            'Cache-Control': 'max-age=300'
          }
        })

        if (!response.ok) {
          throw new Error(`Failed to fetch search index: ${response.status}`)
        }

        const data = await response.json()
        const index = Array.isArray(data) ? data : []

        if (isMounted) {
          setSearchIndex(index)
          setIndexLoaded(true)
        }
      } catch (error) {
        logger.error('Error loading search index:', { data: error, tags: { type: 'component' } })
        if (isMounted) {
          setError(
            `Failed to load search index: ${error instanceof Error ? error.message : 'Unknown error'}`
          )
          setIndexLoaded(true)
        }
      }
    }

    loadSearchIndex()
    return () => {
      isMounted = false
    }
  }, [])

  // Search and filter results
  useEffect(() => {
    /**
     * Fetch and filter search results
     *
     * @returns Promise<void>
     */
    async function fetchSearchResults() {
      if (!query) {
        setResults([])
        setLoading(false)
        return
      }

      if (!indexLoaded) {
        setLoading(true)
        return
      }

      setLoading(true)
      setError(null)

      try {
        // Filter, sort, and validate results
        const filtered = filterAndSortEntries(searchIndex, query)
        const valid = validateEntries(filtered)

        // Use lenient processing if no valid results
        if (valid.length === 0) {
          const lenientResults = tryLenientProcessing(filtered)
          setResults(lenientResults)
          return
        }

        // Transform and sanitize results
        const results = transformAndSanitizeEntries(valid)
        setResults(results)
      } catch (error) {
        logger.error('Error fetching or processing search results:', {
          data: error,
          tags: { type: 'component' }
        })
        setError(error instanceof Error ? error.message : 'An unknown error occurred')
        setResults([])
      } finally {
        setLoading(false)
      }
    }

    // Debounce search
    const debounceTimer = setTimeout(fetchSearchResults, 300)
    return () => clearTimeout(debounceTimer)
  }, [query, indexLoaded, searchIndex])

  return { results, loading, error }
}
