'use client'
import { Button } from '@thedaviddias/design-system/button'
import { ChevronDown } from 'lucide-react'
import { useCallback, useEffect, useMemo, useState } from 'react'
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
  const [showAll, setShowAll] = useState(false)
  const [showFavoritesOnly, setShowFavoritesOnly] = useState(initialShowFavoritesOnly)
  const [isClient, setIsClient] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const [allWebsites, setAllWebsites] = useState<WebsiteMetadata[]>(initialWebsites)
  const [isLoadingMore, setIsLoadingMore] = useState(false)
  const { trackSearch, trackSortChange, trackShowAll, trackShowLess } = useAnalyticsEvents()
  const { favoriteWebsites, hasFavorites } = useFavoritesFilter(allWebsites)

  /**
   * Load more websites from the API when user clicks "Show all"
   * Continues loading until all websites are fetched
   */
  const loadMoreWebsites = useCallback(async () => {
    if (isLoadingMore || !totalCount || allWebsites.length >= totalCount) return

    setIsLoadingMore(true)
    try {
      let currentOffset = allWebsites.length
      let hasMore = true

      // Load in batches of 50 until we have all websites
      while (hasMore && currentOffset < totalCount) {
        const response = await fetch(`/api/websites/paginated?offset=${currentOffset}&limit=50`)
        if (response.ok) {
          const data = await response.json()
          setAllWebsites(prev => [...prev, ...data.websites])

          currentOffset += data.websites.length
          hasMore = data.hasMore && data.websites.length > 0
        } else {
          hasMore = false
        }
      }
    } catch (error) {
      console.error('Failed to load more websites:', error)
    } finally {
      setIsLoadingMore(false)
    }
  }, [allWebsites.length, totalCount, isLoadingMore])

  // Load state from localStorage on mount
  useEffect(() => {
    // Use requestAnimationFrame to load immediately after render
    requestAnimationFrame(() => {
      const savedShowAll = localStorage.getItem('websites-show-all')
      const savedSortBy = localStorage.getItem('websites-sort-by')

      if (savedShowAll !== null) {
        setShowAll(JSON.parse(savedShowAll))
      }
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

  // Save showAll state to localStorage when it changes
  useEffect(() => {
    if (isClient) {
      localStorage.setItem('websites-show-all', JSON.stringify(showAll))
    }
  }, [showAll, isClient])

  // Save sortBy state to localStorage when it changes
  useEffect(() => {
    if (isClient) {
      localStorage.setItem('websites-sort-by', JSON.stringify(sortBy))
    }
  }, [sortBy, isClient])

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

  // Calculate initial visible items and show more logic
  const itemsPerRow = 6 // Maximum columns on largest screens
  const initialVisibleItems = initialRows * itemsPerRow
  const hasMoreToShow =
    filteredAndSortedWebsites.length > initialVisibleItems && !searchQuery.trim()
  const hasMoreWebsitesToLoad = totalCount ? allWebsites.length < totalCount : false

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
                maxItems={searchQuery.trim() || showAll ? undefined : initialVisibleItems}
                animateIn={!searchQuery.trim() && !isLoading}
                className={`transition-all duration-500 ease-in-out ${
                  !searchQuery.trim() && !showAll ? 'max-h-[800px] overflow-hidden' : ''
                }`}
              />
            </div>

            {/* Gradient overlay when collapsed */}
            {!showAll && !searchQuery.trim() && hasMoreToShow && (
              <div className="absolute bottom-0 left-0 right-0 h-32 bg-gradient-to-t from-background via-background/80 to-transparent pointer-events-none transition-opacity duration-500" />
            )}
          </div>

          {/* Load All Button */}
          {hasMoreToShow && (
            <div
              className={`mt-8 text-center transition-opacity duration-300 ${isLoading ? 'opacity-50' : 'opacity-100'}`}
            >
              <Button
                onClick={async () => {
                  if (!showAll) {
                    // Track show all event
                    trackShowAll('websites', filteredAndSortedWebsites.length, 'homepage-show-all')

                    // Load more websites if we don't have all of them yet
                    if (hasMoreWebsitesToLoad) {
                      await loadMoreWebsites()
                    }
                  } else {
                    // Track show less event
                    trackShowLess('homepage-show-less')
                  }
                  setShowAll(!showAll)
                }}
                variant="outline"
                className="min-w-[200px] transition-all duration-300 hover:scale-105"
                disabled={isLoading || isLoadingMore}
              >
                <ChevronDown
                  className={`mr-2 h-4 w-4 transition-transform duration-300 ${showAll ? 'rotate-180' : ''}`}
                />
                {isLoadingMore
                  ? 'Loading all websites...'
                  : showAll
                    ? 'Show less'
                    : hasMoreWebsitesToLoad
                      ? `Load all ${totalCount} websites`
                      : 'Show all websites'}
              </Button>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
