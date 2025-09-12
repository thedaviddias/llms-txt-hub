'use client'
import { useCallback, useEffect, useId, useMemo, useRef, useState } from 'react'
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
  const sentinelId = useId()
  const sentinelRef = useRef<HTMLDivElement>(null)
  const { trackSearch, trackSortChange } = useAnalyticsEvents()
  const { favoriteWebsites, hasFavorites } = useFavoritesFilter(allWebsites)

  /**
   * Load more websites from the API when user scrolls to bottom
   * Loads 24 websites at a time for optimal performance
   */
  const loadMoreWebsites = useCallback(async () => {
    if (process.env.NODE_ENV === 'development') {
      console.log('loadMoreWebsites called:', {
        isLoadingMore,
        hasMoreWebsites,
        totalCount,
        currentLength: allWebsites.length
      })
    }
    
    if (isLoadingMore || !hasMoreWebsites || !totalCount) {
      if (process.env.NODE_ENV === 'development') {
        console.log('Early return from loadMoreWebsites')
      }
      return
    }
    
    setIsLoadingMore(true)
    try {
      const url = `/api/websites/paginated?offset=${allWebsites.length}&limit=24`
      if (process.env.NODE_ENV === 'development') {
        console.log('Fetching from URL:', url)
      }
      
      const response = await fetch(url)
      if (process.env.NODE_ENV === 'development') {
        console.log('Response status:', response.status)
      }
      
      if (response.ok) {
        const data = await response.json()
        if (process.env.NODE_ENV === 'development') {
          console.log('Received data:', {
            websitesCount: data.websites.length,
            hasMore: data.hasMore,
            totalCount: data.totalCount
          })
        }
        
        setAllWebsites(prev => {
          const newWebsites = [...prev, ...data.websites]
          if (process.env.NODE_ENV === 'development') {
            console.log('Updated websites count:', newWebsites.length)
          }
          return newWebsites
        })
        setHasMoreWebsites(data.hasMore && data.websites.length > 0)
      } else {
        console.error('Response not ok:', response.status, response.statusText)
      }
    } catch (error) {
      console.error('Failed to load more websites:', error)
    } finally {
      setIsLoadingMore(false)
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

  // Intersection Observer for infinite scroll
  useEffect(() => {
    if (!isClient || searchQuery.trim() || showFavoritesOnly || !hasMoreWebsites) return

    const observer = new IntersectionObserver(
      entries => {
        const target = entries[0]
        // Temporary debugging - remove after testing
        if (process.env.NODE_ENV === 'development') {
          console.log('Intersection observer triggered:', {
            isIntersecting: target.isIntersecting,
            hasMoreWebsites,
            isLoadingMore,
            allWebsitesLength: allWebsites.length
          })
        }
        
        if (target.isIntersecting && hasMoreWebsites && !isLoadingMore) {
          if (process.env.NODE_ENV === 'development') {
            console.log('Loading more websites...')
          }
          loadMoreWebsites()
        }
      },
      {
        threshold: 0.1,
        rootMargin: '200px'
      }
    )

    const sentinel = sentinelRef.current
    if (sentinel) {
      observer.observe(sentinel)
      if (process.env.NODE_ENV === 'development') {
        console.log('Sentinel element observed:', sentinel)
      }
    } else {
      if (process.env.NODE_ENV === 'development') {
        console.log('Sentinel element not found!')
      }
    }

    return () => {
      if (sentinel) {
        observer.unobserve(sentinel)
      }
    }
  }, [isClient, searchQuery, showFavoritesOnly, hasMoreWebsites, isLoadingMore, loadMoreWebsites, allWebsites.length])

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
                maxItems={searchQuery.trim() ? undefined : initialVisibleItems}
                animateIn={!searchQuery.trim() && !isLoading}
                className="transition-all duration-500 ease-in-out"
              />
            </div>
          </div>

          {/* Infinite Scroll Sentinel and Loading Indicator */}
          {!searchQuery.trim() && !showFavoritesOnly && (
            <>
              {/* Scroll Sentinel for infinite scroll */}
              <div ref={sentinelRef} className="h-4" />

              {/* Loading indicator */}
              {isLoadingMore && (
                <div className="mt-8 text-center">
                  <div className="inline-flex items-center gap-2 text-muted-foreground">
                    <div className="h-4 w-4 animate-spin rounded-full border-2 border-muted-foreground border-t-transparent" />
                    <span>Loading more websites...</span>
                  </div>
                </div>
              )}

              {/* End of results indicator */}
              {!hasMoreWebsites && allWebsites.length > 0 && (
                <div className="mt-8 text-center">
                  <p className="text-sm text-muted-foreground">
                    You've reached the end! Showing all {allWebsites.length} websites.
                  </p>
                </div>
              )}
            </>
          )}
        </div>
      )}
    </div>
  )
}
