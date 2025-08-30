'use client'
import { useAnalyticsEvents } from '@/components/analytics-tracker'
import { EmptyState } from '@/components/empty-state'
import { LLMGrid } from '@/components/llm/llm-grid'
import { useFavoritesFilter } from '@/hooks/use-favorites-filter'
import type { WebsiteMetadata } from '@/lib/content-loader'
import { getRoute } from '@/lib/routes'
import { Button } from '@thedaviddias/design-system/button'
import { ToggleGroup, ToggleGroupItem } from '@thedaviddias/design-system/toggle-group'
import { ChevronDown, Clock, Heart, Search, SortAsc } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { useEffect, useMemo, useState } from 'react'

interface WebsitesListWithSearchProps {
  initialWebsites: WebsiteMetadata[]
  emptyTitle?: string
  emptyDescription?: string
  initialRows?: number
  initialShowFavoritesOnly?: boolean
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
  initialShowFavoritesOnly = false
}: WebsitesListWithSearchProps) {
  const router = useRouter()
  const [sortBy, setSortBy] = useState<'name' | 'latest'>('latest')
  const [searchQuery, setSearchQuery] = useState('')
  const [showAll, setShowAll] = useState(false)
  const [showFavoritesOnly, setShowFavoritesOnly] = useState(initialShowFavoritesOnly)
  const [isClient, setIsClient] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const { trackSearch, trackSortChange, trackShowAll, trackShowLess } = useAnalyticsEvents()
  const { favoriteWebsites, hasFavorites } = useFavoritesFilter(initialWebsites)

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
    let websites = showFavoritesOnly ? [...favoriteWebsites] : [...initialWebsites]

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
  }, [initialWebsites, favoriteWebsites, showFavoritesOnly, sortBy, searchQuery])

  // Calculate initial visible items and show more logic
  const itemsPerRow = 6 // Maximum columns on largest screens
  const initialVisibleItems = initialRows * itemsPerRow
  const hasMoreToShow =
    filteredAndSortedWebsites.length > initialVisibleItems && !searchQuery.trim()
  const _shouldUseLoadMore = filteredAndSortedWebsites.length > 50 && !searchQuery.trim()

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
      <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
        {/* Search Input - Same design as header */}
        <form
          onSubmit={e => {
            e.preventDefault()
            if (searchQuery.trim()) {
              // Track search event
              trackSearch(searchQuery, filteredAndSortedWebsites.length, 'homepage-search')
              router.push(`/search?q=${encodeURIComponent(searchQuery)}`)
            }
          }}
          className="relative flex-1 max-w-md"
        >
          <input
            type="text"
            placeholder="Search..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            className="w-full rounded-lg border border-input bg-background px-4 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
          />
          <button
            type="submit"
            className="absolute inset-y-0 right-0 flex items-center px-2 text-muted-foreground"
            aria-label="Search"
          >
            <Search className="h-4 w-4" />
          </button>
        </form>

        {/* Filter and Sort Controls */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
          {/* Favorites Filter */}
          {hasFavorites && (
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setShowFavoritesOnly(!showFavoritesOnly)}
                className={`flex items-center gap-2 px-3 py-2 rounded-md border text-sm transition-colors cursor-pointer ${
                  showFavoritesOnly
                    ? 'bg-accent text-accent-foreground border-accent'
                    : 'bg-background hover:bg-muted/50 border-border'
                }`}
              >
                <Heart
                  className={`h-4 w-4 ${showFavoritesOnly ? 'fill-red-500 text-red-500' : 'text-muted-foreground'}`}
                />
                <span>{showFavoritesOnly ? 'Show All' : 'Favorites Only'}</span>
              </button>
            </div>
          )}

          {/* Sort Controls */}
          <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground">Sort by:</span>
            <ToggleGroup
              type="single"
              value={sortBy}
              onValueChange={(value: string) => {
                if (value && value !== sortBy) {
                  // Track sort change
                  trackSortChange(sortBy, value, 'homepage-sort')
                  setSortBy(value as 'name' | 'latest')
                }
              }}
              className="bg-background border rounded-md"
            >
              <ToggleGroupItem
                value="name"
                className="px-3 py-2 h-10 data-[state=on]:bg-accent cursor-pointer"
              >
                <SortAsc className="size-4 mr-2" />
                <span className="text-sm">Name</span>
              </ToggleGroupItem>
              <ToggleGroupItem
                value="latest"
                className="px-3 py-2 h-10 data-[state=on]:bg-accent cursor-pointer"
              >
                <Clock className="size-4 mr-2" />
                <span className="text-sm">Latest</span>
              </ToggleGroupItem>
            </ToggleGroup>
          </div>
        </div>
      </div>

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
                onClick={() => {
                  // Track show all/less event
                  if (!showAll) {
                    trackShowAll('websites', filteredAndSortedWebsites.length, 'homepage-show-all')
                  } else {
                    trackShowLess('homepage-show-less')
                  }
                  setShowAll(!showAll)
                }}
                variant="outline"
                className="min-w-[200px] transition-all duration-300 hover:scale-105"
                disabled={isLoading}
              >
                <ChevronDown
                  className={`mr-2 h-4 w-4 transition-transform duration-300 ${showAll ? 'rotate-180' : ''}`}
                />
                {showAll ? 'Show less' : 'Show all websites'}
              </Button>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
