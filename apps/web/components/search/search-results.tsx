'use client'

import { EmptyState } from '@/components/empty-state'
import { ClientProjectsList } from '@/components/projects-list'
import type { WebsiteMetadata } from '@/lib/mdx'
import { getRoute } from '@/lib/routes'
import { ErrorBoundaryCustom } from '@thedaviddias/design-system/error-boundary'
import { useSearchParams } from 'next/navigation'
import { useEffect, useState } from 'react'

// Move all the types and utility functions from the page component
type SearchIndexEntry = {
  title?: string
  description?: string
  url?: string
  content?: string
  category?: string
  slug?: string
  name?: string
  website?: string
  llmsUrl?: string
  llmsFullUrl?: string
}

function canTransformToWebsiteMetadata(entry: SearchIndexEntry): boolean {
  try {
    if (!entry) return false

    // Explicitly exclude .DS_Store entries
    if (entry.url === '/.DS_Store' || entry.slug === '.DS_Store') {
      return false
    }

    // We only need either a slug/url to create a slug, and a name/title for display
    const hasMinimumData = Boolean(
      (entry.slug || entry.url) && (entry.name || entry.title || entry.description)
    )

    return hasMinimumData
  } catch (error) {
    console.error('Error in canTransformToWebsiteMetadata:', error, 'Entry:', entry)
    return false
  }
}

function transformToWebsiteMetadata(entry: SearchIndexEntry): WebsiteMetadata {
  try {
    // Generate a slug from URL if not available
    let slug = entry.slug
    if (!slug && entry.url) {
      // Try to extract a meaningful slug from the URL
      const urlParts = (entry.url || '').split('/').filter(Boolean)
      slug = urlParts[urlParts.length - 1] || 'unknown'
    }

    return {
      slug: slug || 'unknown',
      name: entry.name || entry.title || 'Unknown',
      description: entry.description || '',
      website: entry.website || entry.url || '#',
      llmsUrl: entry.llmsUrl || '#', // Default to # if not available
      llmsFullUrl: entry.llmsFullUrl,
      category: entry.category || ''
    }
  } catch (error) {
    console.error('Error in transformToWebsiteMetadata:', error, 'Entry:', entry)
    // Return a minimal valid entry to prevent breaking the entire search
    return {
      slug: 'error',
      name: 'Error processing result',
      description: '',
      website: '#',
      llmsUrl: '#',
      category: ''
    }
  }
}

function matchesSearchQuery(entry: SearchIndexEntry, query: string): boolean {
  try {
    if (!entry || !query) return false

    // Normalize the query
    const normalizedQuery = query.toLowerCase().trim()
    if (!normalizedQuery) return true // Empty query matches everything

    // Split query into words for more flexible matching
    const queryWords = normalizedQuery.split(/\s+/).filter(Boolean)

    // Create a string with all searchable content from the entry
    const searchableContent = Object.entries(entry)
      .filter(([key, value]) => {
        // Only include string values and exclude some keys
        return typeof value === 'string' && !['llmsUrl', 'llmsFullUrl', 'lastUpdated'].includes(key)
      })
      .map(([_, value]) => String(value)) // Ensure value is a string
      .join(' ')
      .toLowerCase()

    // For partial matches, check if any query word is a substring of the content
    return queryWords.some(word => searchableContent.includes(word))
  } catch (error) {
    console.error('Error in matchesSearchQuery:', error, 'Entry:', entry, 'Query:', query)
    // Return false instead of throwing to prevent breaking the entire search
    return false
  }
}

export function SearchResults() {
  const searchParams = useSearchParams()
  const query = searchParams.get('q') || ''
  const [results, setResults] = useState<WebsiteMetadata[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    async function fetchSearchResults() {
      if (!query) {
        setResults([])
        setLoading(false)
        return
      }

      setLoading(true)
      setError(null)

      try {
        // Fetch the search index with cache busting to prevent stale data
        const cacheBuster = new Date().getTime()
        const response = await fetch(`/search/search-index.json?_=${cacheBuster}`, {
          headers: {
            'Cache-Control': 'no-cache',
            Pragma: 'no-cache'
          }
        })

        if (!response.ok) {
          throw new Error(`Failed to fetch search index: ${response.status} ${response.statusText}`)
        }

        let searchIndex: SearchIndexEntry[] = []

        try {
          const text = await response.text()

          // Log the raw response for debugging
          console.log('Raw search index response (first 200 chars):', text.substring(0, 200))

          try {
            const data = JSON.parse(text)
            searchIndex = Array.isArray(data) ? data : []
          } catch (jsonError) {
            console.error('JSON parse error:', jsonError)
            throw new Error(`Failed to parse search index: ${jsonError}`)
          }
        } catch (parseError) {
          console.error('Error processing search index:', parseError)
          throw new Error(`Error processing search index: ${parseError}`)
        }

        console.log(`Searching for: "${query}" in ${searchIndex.length} entries`)

        // Safely filter results with error handling
        let filteredResults: SearchIndexEntry[] = []
        try {
          // Filter results based on the query using our improved matching function
          filteredResults = searchIndex.filter(entry => {
            try {
              return matchesSearchQuery(entry, query)
            } catch (matchError) {
              console.error('Error matching entry:', matchError, entry)
              return false
            }
          })
          console.log(`Found ${filteredResults.length} matches before validation`)
        } catch (filterError) {
          console.error('Error during filtering:', filterError)
          throw new Error(`Error filtering search results: ${filterError}`)
        }

        // Safely validate results with error handling
        let validResults: SearchIndexEntry[] = []
        try {
          // Validate and transform search results to match WebsiteMetadata format
          validResults = filteredResults.filter(entry => {
            try {
              return canTransformToWebsiteMetadata(entry)
            } catch (validationError) {
              console.error('Error validating entry:', validationError, entry)
              return false
            }
          })
          console.log(`Found ${validResults.length} valid results after validation`)
        } catch (validationError) {
          console.error('Error during validation:', validationError)
          throw new Error(`Error validating search results: ${validationError}`)
        }

        if (validResults.length === 0) {
          // If no valid results after strict filtering, try a more lenient approach
          // This is a fallback to ensure we show something if possible
          try {
            const lenientResults = filteredResults
              .map(entry => {
                try {
                  return transformToWebsiteMetadata(entry)
                } catch (e) {
                  console.warn('Error transforming entry:', e)
                  return null
                }
              })
              .filter(Boolean) as WebsiteMetadata[]

            console.log(`Found ${lenientResults.length} results with lenient validation`)
            setResults(lenientResults)
            return
          } catch (lenientError) {
            console.error('Error during lenient processing:', lenientError)
            // Continue to try the standard approach
          }
        }

        try {
          const transformedResults = validResults.map(entry => {
            try {
              return transformToWebsiteMetadata(entry)
            } catch (transformError) {
              console.error('Error transforming entry:', transformError, entry)
              // Return a minimal valid entry to prevent breaking the entire search
              return {
                slug: 'error',
                name: 'Error processing result',
                description: '',
                website: '#',
                llmsUrl: '#',
                category: ''
              }
            }
          })

          // Validate all website URLs before rendering to prevent URL construction errors
          const sanitizedResults = transformedResults.map(result => {
            // Ensure website is a valid URL or use a fallback
            if (!result.website || result.website === '#') {
              return result
            }

            try {
              // Test if it's a valid URL by trying to construct it
              new URL(
                result.website.startsWith('http') ? result.website : `https://${result.website}`
              )
              return result
            } catch (urlError) {
              console.warn(`Invalid website URL found: ${result.website}`, urlError)
              // Return the result but with a safe website value
              return {
                ...result,
                website: '#'
              }
            }
          })

          console.log(`Transformed ${sanitizedResults.length} valid results`)
          setResults(sanitizedResults)
        } catch (transformError) {
          console.error('Error during transformation:', transformError)
          throw new Error(`Error transforming search results: ${transformError}`)
        }
      } catch (error) {
        console.error('Error fetching or processing search results:', error)
        setError(error instanceof Error ? error.message : 'An unknown error occurred')
        setResults([])
      } finally {
        setLoading(false)
      }
    }

    fetchSearchResults()
  }, [query])

  useEffect(() => {
    if (query) {
      document.title = `Search Results for "${query}" | llms.txt hub`
    } else {
      document.title = 'Search | llms.txt hub'
    }
  }, [query])

  if (error) {
    return (
      <div className="border border-red-200 bg-red-50 dark:bg-red-900/20 dark:border-red-800 p-4 rounded-md">
        <h2 className="text-lg font-semibold text-red-800 dark:text-red-400">
          Something went wrong
        </h2>
        <p className="text-red-700 dark:text-red-300 mt-1">{error}</p>
        <button
          type="button"
          onClick={() => window.location.reload()}
          className="mt-3 px-4 py-2 bg-red-100 dark:bg-red-800 text-red-800 dark:text-red-200 rounded-md hover:bg-red-200 dark:hover:bg-red-700 transition-colors"
        >
          Refresh Page
        </button>
      </div>
    )
  }

  return (
    <>
      {loading ? (
        <div className="flex justify-center py-8">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary-500" />
        </div>
      ) : results.length > 0 ? (
        <ErrorBoundaryCustom>
          <ClientProjectsList initialWebsites={results} />
        </ErrorBoundaryCustom>
      ) : (
        <EmptyState
          title="No results found"
          description={`We couldn't find any results for "${query}". Try using different keywords or check your spelling.`}
          actionLabel="Submit llms.txt"
          actionHref={getRoute('submit')}
        />
      )}
    </>
  )
}
