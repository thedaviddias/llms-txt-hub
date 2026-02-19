'use client'

import { logger } from '@thedaviddias/logging'
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
  const [isSearching, setIsSearching] = useState(false)
  const [isSearchPending, setIsSearchPending] = useState(false)
  const [searchResults, setSearchResults] = useState<WebsiteMetadata[]>([])
  const [searchTotalCount, setSearchTotalCount] = useState(0)
  const isLoadingRef = useRef(false)
  const { trackSearch, trackSortChange } = useAnalyticsEvents()
  const { favoriteWebsites, hasFavorites } = useFavoritesFilter(allWebsites)

  /**
   * Search all websites using server-side search
   * Searches across all 887+ websites regardless of what's loaded on the page
   */
  const searchAllWebsites = useCallback(async (query: string) => {
    if (!query.trim()) {
      setSearchResults([])
      setSearchTotalCount(0)
      setIsSearchPending(false)
      return
    }

    setIsSearchPending(true)
    setIsSearching(true)
    try {
      const response = await fetch(
        `/api/websites/search?q=${encodeURIComponent(query.trim())}&limit=100`
      )
      if (response.ok) {
        const data = await response.json()
        setSearchResults(data.websites)
        setSearchTotalCount(data.totalCount)
      }
    } catch (error) {
      logger.error(error instanceof Error ? error : new Error(String(error)), {
        data: error,
        tags: { type: 'component', component: 'websites-list-with-search' }
      })
      setSearchResults([])
      setSearchTotalCount(0)
    } finally {
      setIsSearching(false)
      setIsSearchPending(false)
    }
  }, [])

  /**
   * Load more websites from the API when user clicks Load More button
   * Loads 48 websites at a time for optimal performance
   * Follows Load More UX pattern for better performance and user control
   */
  const loadMoreWebsites = useCallback(async () => {
    if (isLoadingRef.current || isLoadingMore || !hasMoreWebsites || !totalCount) return

    isLoadingRef.current = true
    setIsLoadingMore(true)
    try {
      const response = await fetch(`/api/websites/paginated?offset=${allWebsites.length}&limit=48`)
      if (response.ok) {
        const data = await response.json()
        setAllWebsites(prev => [...prev, ...data.websites])
        setHasMoreWebsites(data.hasMore && data.websites.length > 0)
      }
    } catch (error) {
      logger.error(error instanceof Error ? error : new Error(String(error)), {
        data: error,
        tags: { type: 'component', component: 'websites-list-with-search' }
      })
    } finally {
      setIsLoadingMore(false)
      isLoadingRef.current = false
    }
  }, [allWebsites.length, hasMoreWebsites, totalCount, isLoadingMore])

  useEffect(() => {
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

  useEffect(() => {
    if (isClient) {
      localStorage.setItem('websites-sort-by', JSON.stringify(sortBy))
    }
  }, [sortBy, isClient])

  useEffect(() => {
    if (searchQuery.trim()) {
      setIsSearchPending(true)
    } else {
      setIsSearchPending(false)
      setSearchResults([])
      setSearchTotalCount(0)
    }

    const timeoutId = setTimeout(() => {
      if (searchQuery.trim()) {
        searchAllWebsites(searchQuery)
      }
    }, 300) // 300ms debounce

    return () => clearTimeout(timeoutId)
  }, [searchQuery, searchAllWebsites])

  const filteredAndSortedWebsites = useMemo(() => {
    if (searchQuery.trim()) {
      let websites = [...searchResults]
      if (showFavoritesOnly) {
        const favoriteSlugs = new Set(favoriteWebsites.map(w => w.slug))
        websites = websites.filter(website => favoriteSlugs.has(website.slug))
      }

      if (sortBy === 'latest') {
        return websites.sort((a, b) => {
          const dateA = new Date(a.publishedAt).getTime()
          const dateB = new Date(b.publishedAt).getTime()
          return dateB - dateA
        })
      } else {
        return websites.sort((a, b) => a.name.localeCompare(b.name))
      }
    }

    let websites = showFavoritesOnly ? [...favoriteWebsites] : [...allWebsites]
    if (sortBy === 'latest') {
      return websites.sort((a, b) => {
        const dateA = new Date(a.publishedAt).getTime()
        const dateB = new Date(b.publishedAt).getTime()
        return dateB - dateA
      })
    } else {
      return websites.sort((a, b) => a.name.localeCompare(b.name))
    }
  }, [allWebsites, favoriteWebsites, showFavoritesOnly, sortBy, searchQuery, searchResults])

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

      {filteredAndSortedWebsites.length === 0 ? (
        searchQuery.trim() && (isSearchPending || isSearching) ? (
          <div className="flex flex-col items-center justify-center py-12">
            <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent mb-4" />
            <p className="text-sm text-muted-foreground">
              {isSearching
                ? `Searching all ${totalCount || 0} websites for "${searchQuery}"...`
                : `Preparing search for "${searchQuery}"...`}
            </p>
          </div>
        ) : searchQuery.trim() && !isSearchPending && !isSearching ? (
          <EmptyState
            title="No results found"
            description={`No websites found matching "${searchQuery}". Try a different search term.`}
            actionLabel="Clear Search"
            onAction={() => setSearchQuery('')}
          />
        ) : (
          <EmptyState title={emptyTitle} description={emptyDescription} />
        )
      ) : (
        <div>
          <h2 className="text-2xl font-semibold mb-6 sr-only">Websites</h2>
          {searchQuery && !isSearching && (
            <p className="text-sm text-muted-foreground mb-4">
              Showing {filteredAndSortedWebsites.length} of {searchTotalCount} result
              {searchTotalCount !== 1 ? 's' : ''} for "{searchQuery}"
            </p>
          )}

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

          {!searchQuery.trim() && !isSearching && (
            <div className="mt-8 text-center" aria-live="polite">
              {hasMoreWebsites ? (
                <button
                  type="button"
                  onClick={loadMoreWebsites}
                  disabled={isLoadingMore}
                  className="inline-flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-md text-sm font-medium hover:bg-primary/90 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors min-h-[36px]"
                  aria-label={`Load 48 more websites. Currently showing ${allWebsites.length} of ${totalCount || 0} websites.`}
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
                        ({totalCount ? totalCount - allWebsites.length : 0} remaining)
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
                Showing {allWebsites.length} of {totalCount || 0} websites
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
