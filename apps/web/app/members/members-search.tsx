'use client'

import { useDebounce } from '@/hooks/use-debounce'
import { Button } from '@thedaviddias/design-system/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger
} from '@thedaviddias/design-system/dropdown-menu'
import { ChevronDown, Filter, Search, Star, Users } from 'lucide-react'
import { usePathname, useRouter, useSearchParams } from 'next/navigation'
import { useCallback, useEffect, useState, useTransition } from 'react'

export function MembersSearch() {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const [isPending, startTransition] = useTransition()

  const [searchQuery, setSearchQuery] = useState(searchParams.get('search') || '')
  const [filter, setFilter] = useState(searchParams.get('filter') || 'all')

  // Debounce the search query
  const debouncedSearch = useDebounce(searchQuery, 300)

  // Update URL when debounced search changes
  useEffect(() => {
    const params = new URLSearchParams(searchParams)

    if (debouncedSearch) {
      params.set('search', debouncedSearch)
    } else {
      params.delete('search')
    }

    if (filter !== 'all') {
      params.set('filter', filter)
    } else {
      params.delete('filter')
    }

    // Reset page when search/filter changes
    params.delete('page')

    startTransition(() => {
      router.push(`${pathname}?${params.toString()}`)
    })
  }, [debouncedSearch, filter, pathname, router, searchParams])

  const handleSearchChange = useCallback((value: string) => {
    setSearchQuery(value)
  }, [])

  const handleFilterChange = useCallback((newFilter: string) => {
    setFilter(newFilter)
  }, [])

  const handleClearSearch = useCallback(() => {
    setSearchQuery('')
  }, [])

  return (
    <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
      {/* Search Input */}
      <div className="relative flex-1 max-w-sm">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <input
          type="text"
          placeholder="Search members..."
          value={searchQuery}
          onChange={e => handleSearchChange(e.target.value)}
          className="h-10 w-full rounded-md border border-input bg-background px-10 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
        />
        {searchQuery && (
          <button
            type="button"
            onClick={handleClearSearch}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
            aria-label="Clear search"
          >
            ×
          </button>
        )}
        {isPending && (
          <div className="absolute right-10 top-1/2 -translate-y-1/2">
            <div className="h-4 w-4 animate-spin rounded-full border-2 border-primary border-t-transparent" />
          </div>
        )}
      </div>

      {/* Filter Dropdown */}
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="outline" size="sm">
            <Filter className="mr-2 h-4 w-4" />
            {filter === 'contributors' && 'Contributors'}
            {filter === 'community' && 'Community'}
            {filter === 'all' && 'All Members'}
            <ChevronDown className="ml-2 h-4 w-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-48">
          <DropdownMenuItem onClick={() => handleFilterChange('all')}>
            <Users className="mr-2 h-4 w-4" />
            All Members
            {filter === 'all' && <span className="ml-auto">✓</span>}
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => handleFilterChange('contributors')}>
            <Star className="mr-2 h-4 w-4" />
            Contributors
            {filter === 'contributors' && <span className="ml-auto">✓</span>}
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => handleFilterChange('community')}>
            <Users className="mr-2 h-4 w-4" />
            Community
            {filter === 'community' && <span className="ml-auto">✓</span>}
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  )
}
