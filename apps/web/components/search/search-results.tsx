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
}

function transformToWebsiteMetadata(entry: SearchIndexEntry): WebsiteMetadata {
  // Generate a slug from URL if not available
  let slug = entry.slug
  if (!slug && entry.url) {
    // Try to extract a meaningful slug from the URL
    const urlParts = entry.url.split('/').filter(Boolean)
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
}

function matchesSearchQuery(entry: SearchIndexEntry, query: string): boolean {
  if (!entry || !query) return false

  // Normalize the query
  const normalizedQuery = query.toLowerCase().trim()
  if (!normalizedQuery) return true // Empty query matches everything

  // Split query into words for more flexible matching
  const queryWords = normalizedQuery.split(/\s+/).filter(Boolean)

  // Create a string with all searchable content from the entry
  const searchableContent = Object.entries(entry)
    .filter(
      ([key, value]) =>
        // Only include string values and exclude some keys
        typeof value === 'string' && !['llmsUrl', 'llmsFullUrl', 'lastUpdated'].includes(key)
    )
    .map(([_, value]) => value)
    .join(' ')
    .toLowerCase()

  // Check if any of the query words are in the searchable content
  return queryWords.some(word => searchableContent.includes(word))
}

export function SearchResults() {
  const searchParams = useSearchParams()
  const query = searchParams.get('q') || ''
  const [results, setResults] = useState<WebsiteMetadata[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    async function fetchSearchResults() {
      setLoading(true)
      setError(null)

      try {
        // Fetch the search index
        const response = await fetch('/search/search-index.json')

        if (!response.ok) {
          throw new Error(`Failed to fetch search index: ${response.status} ${response.statusText}`)
        }

        let searchIndex: SearchIndexEntry[]

        try {
          const data = await response.json()
          searchIndex = Array.isArray(data) ? data : []

          // Log the first few entries to help with debugging
          console.log('Search index sample:', searchIndex.slice(0, 3))
        } catch (parseError) {
          console.error('Error parsing search index:', parseError)
          searchIndex = []
        }

        if (!query) {
          setResults([])
          return
        }

        console.log(`Searching for: "${query}" in ${searchIndex.length} entries`)

        // Filter results based on the query using our improved matching function
        const filteredResults = searchIndex.filter(entry => matchesSearchQuery(entry, query))

        console.log(`Found ${filteredResults.length} matches before validation`)

        // Validate and transform search results to match WebsiteMetadata format
        const validResults = filteredResults.filter(canTransformToWebsiteMetadata)

        console.log(`Found ${validResults.length} valid results after validation`)

        if (validResults.length === 0) {
          // If no valid results after strict filtering, try a more lenient approach
          // This is a fallback to ensure we show something if possible
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
        }

        const transformedResults = validResults.map(transformToWebsiteMetadata)
        console.log(`Transformed ${transformedResults.length} valid results`)
        setResults(transformedResults)
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

  if (error) {
    return (
      <div className="border border-red-200 bg-red-50 dark:bg-red-900/20 dark:border-red-800 p-4 rounded-md">
        <h2 className="text-lg font-semibold text-red-800 dark:text-red-400">
          Something went wrong
        </h2>
        <p className="text-red-700 dark:text-red-300 mt-1">
          We encountered an error while searching. Please try again later.
        </p>
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
