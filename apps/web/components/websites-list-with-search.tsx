'use client'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useAnalyticsEvents } from '@/components/analytics-tracker'
import { EmptyState } from '@/components/empty-state'
import { LLMGrid } from '@/components/llm/llm-grid'
import { WebsitesSearchControls } from '@/components/websites-search-controls'
import { useFavoritesFilter } from '@/hooks/use-favorites-filter'
import type { WebsiteMetadata } from '@/lib/content-loader'
import { getRoute } from '@/lib/routes'

interface WebsitesListWithSearchProps {
  initialWebsites: WebsiteMetadata[]
  emptyTitle?: string
  emptyDescription?: string
  initialRows?: number
  initialShowFavoritesOnly?: boolean
  totalCount?: number
}

/**
 * Client component that handles searching and sorting on the client side
 * Initial data is server-side sorted, then client can filter and re-sort
 */
export function WebsitesListWithSearch({
  initialWebsites,
  emptyTitle = 'No websites found',
  emptyDescription = 'There are no websites available. Try checking back later or submit a new website.',
  initialRows = 3,
  initialShowFavoritesOnly = false,
  totalCount
}: WebsitesListWithSearchProps) {
  const [sortBy, setSortBy] = useState<'name' | 'latest'>('latest')
  const [searchQuery, setSearchQuery] = useState('')
  const [showFavoritesOnly, setShowFavoritesOnly] = useState(initialShowFavoritesOnly)
  const [isClient, setIsClient] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const [allWebsites, setAllWebsites] = useState<WebsiteMetadata[]>(initialWebsites)
  const [isLoadingMore, setIsLoadingMore] = useState(false)
  const [hasMoreWebsites, setHasMoreWebsites] = useState(
    totalCount ? initialWebsites.length < totalCount : false
  )
  const isLoadingRef = useRef(false)
  const { trackSearch, trackSortChange } = useAnalyticsEvents()
  const { favoriteWebsites, hasFavorites } = useFavoritesFilter(allWebsites)

  /**
   * Load more websites from the API when user clicks Load More button
   * Loads 24 websites at a time for optimal performance
   * Follows Load More UX pattern for better performance and user control
   */
  const loadMoreWebsites = useCallback(async () => {
    if (isLoadingRef.current || isLoadingMore || !hasMoreWebsites || !totalCount) return

    isLoadingRef.current = true
    setIsLoadingMore(true)
    try {
      const response = await fetch(`/api/websites/paginated?offset=${allWebsites.length}&limit=24`)
      if (response.ok) {
        const data = await response.json()
        setAllWebsites(prev => [...prev, ...data.websites])
        setHasMoreWebsites(data.hasMore && data.websites.length > 0)
      }
    } catch (error) {
      console.error('Failed to load more websites:', error)
    } finally {
      setIsLoadingMore(false)
      isLoadingRef.current = false
    }
  }, [allWebsites.length, hasMoreWebsites, totalCount, isLoadingMore])

  // Load state from localStorage on mount
  useEffect(() => {
    // Use requestAnimationFrame to load immediately after render
    requestAnimationFrame(() => {
      const savedSortBy = localStorage.getItem('websites-sort-by')

      if (savedSortBy !== null) {
        const parsedSortBy = JSON.parse(savedSortBy)
        if (parsedSortBy === 'name' || parsedSortBy === 'latest') {
          setSortBy(parsedSortBy)
        }
      }

      setIsClient(true)
      setIsLoading(false)
    })
  }, [])

  // Save sortBy state to localStorage when it changes
  useEffect(() => {
    if (isClient) {
      localStorage.setItem('websites-sort-by', JSON.stringify(sortBy))
    }
  }, [sortBy, isClient])

  // Load More Pattern - No automatic loading, user controls when to load more

  // Filter and sort websites
  const filteredAndSortedWebsites = useMemo(() => {
    let websites = showFavoritesOnly ? [...favoriteWebsites] : [...allWebsites]

    // Filter by search query
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase().trim()
      websites = websites.filter(website => {
        return (
          website.name.toLowerCase().includes(query) ||
          website.description.toLowerCase().includes(query) ||
          website.category.toLowerCase().includes(query)
        )
      })
    }

    // Sort
    if (sortBy === 'latest') {
      return websites.sort((a, b) => {
        const dateA = new Date(a.publishedAt).getTime()
        const dateB = new Date(b.publishedAt).getTime()
        return dateB - dateA
      })
    } else {
      return websites.sort((a, b) => a.name.localeCompare(b.name))
    }
  }, [allWebsites, favoriteWebsites, showFavoritesOnly, sortBy, searchQuery])

  // Calculate initial visible items for search results
  const itemsPerRow = 6 // Maximum columns on largest screens
  const initialVisibleItems = initialRows * itemsPerRow

  if (initialWebsites.length === 0) {
    return (
      <EmptyState
        title={emptyTitle}
        description={emptyDescription}
        actionLabel="Add Your your llms.txt"
        actionHref={getRoute('submit')}
      />
    )
  }

  return (
    <div className="space-y-6">
      {/* Search and Sort Controls */}
      <WebsitesSearchControls
        searchQuery={searchQuery}
        setSearchQuery={setSearchQuery}
        sortBy={sortBy}
        setSortBy={setSortBy}
        showFavoritesOnly={showFavoritesOnly}
        setShowFavoritesOnly={setShowFavoritesOnly}
        hasFavorites={hasFavorites}
        filteredCount={filteredAndSortedWebsites.length}
        trackSearch={trackSearch}
        trackSortChange={trackSortChange}
      />

      {/* Results Grid */}
      {filteredAndSortedWebsites.length === 0 ? (
        <EmptyState
          title="No results found"
          description={`No websites match "${searchQuery}". Try a different search or clear the filter.`}
          actionLabel="Clear Filter"
          onAction={() => setSearchQuery('')}
        />
      ) : (
        <div>
          <h2 className="text-2xl font-semibold mb-6 sr-only">Websites</h2>
          <p className="text-sm text-muted-foreground mb-4">
            {searchQuery &&
              `Showing ${filteredAndSortedWebsites.length} result${filteredAndSortedWebsites.length !== 1 ? 's' : ''} for "${searchQuery}"`}
          </p>

          {/* Grid with Animation */}
          <div className="relative">
            <div
              className={`transition-opacity duration-300 ${isLoading ? 'opacity-80' : 'opacity-100'}`}
            >
              <LLMGrid
                items={filteredAndSortedWebsites}
                maxItems={undefined}
                animateIn={!searchQuery.trim() && !isLoading}
                className="transition-all duration-500 ease-in-out"
              />
            </div>
          </div>

          {/* Load More Pattern - Following UX Pattern */}
          {!searchQuery.trim() && !showFavoritesOnly && (
            <div className="mt-8 text-center" aria-live="polite">
              {hasMoreWebsites ? (
                <button
                  type="button"
                  onClick={loadMoreWebsites}
                  disabled={isLoadingMore}
                  className="inline-flex items-center gap-2 px-6 py-3 bg-primary text-primary-foreground rounded-lg font-medium hover:bg-primary/90 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors min-h-[44px] min-w-[120px]"
                  aria-label={`Load 24 more websites. Currently showing ${allWebsites.length} of ${totalCount} websites.`}
                >
                  {isLoadingMore ? (
                    <>
                      <div className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
                      <span>Loading...</span>
                    </>
                  ) : (
                    <>
                      <span>Load More</span>
                      <span className="text-sm opacity-75">
                        ({totalCount - allWebsites.length} remaining)
                      </span>
                    </>
                  )}
                </button>
              ) : (
                <div className="text-sm text-muted-foreground">
                  <p>You've reached the end! Showing all {allWebsites.length} websites.</p>
                </div>
              )}
              
              {/* Progress indicator */}
              <p className="text-xs text-muted-foreground mt-3">
                Showing {allWebsites.length} of {totalCount} websites
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
