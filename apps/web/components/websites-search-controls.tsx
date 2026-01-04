'use client'

import { ToggleGroup, ToggleGroupItem } from '@thedaviddias/design-system/toggle-group'
import { Clock, Heart, Search, SortAsc } from 'lucide-react'
import { useRouter } from 'next/navigation'

interface WebsitesSearchControlsProps {
  searchQuery: string
  setSearchQuery: (query: string) => void
  sortBy: 'name' | 'latest'
  setSortBy: (sort: 'name' | 'latest') => void
  showFavoritesOnly: boolean
  setShowFavoritesOnly: (show: boolean) => void
  hasFavorites: boolean
  filteredCount: number
  trackSearch: (query: string, count: number, source: string) => void
  trackSortChange: (from: string, to: string, source: string) => void
}

/**
 * Search and sort controls for the websites list
 */
export function WebsitesSearchControls({
  searchQuery,
  setSearchQuery,
  sortBy,
  setSortBy,
  showFavoritesOnly,
  setShowFavoritesOnly,
  hasFavorites,
  filteredCount,
  trackSearch,
  trackSortChange
}: WebsitesSearchControlsProps) {
  const router = useRouter()

  return (
    <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
      {/* Search Input */}
      <form
        onSubmit={e => {
          e.preventDefault()
          if (searchQuery.trim()) {
            trackSearch(searchQuery, filteredCount, 'homepage-search')
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
  )
}
