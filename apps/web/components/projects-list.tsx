'use client'

import { EmptyState } from '@/components/empty-state'
import { ProjectList } from '@/components/project-list'
import { categories } from '@/lib/categories'
import type { WebsiteMetadata } from '@/lib/mdx'
import { getRoute } from '@/lib/routes'
import { Button } from '@thedaviddias/design-system/button'
import { ErrorBoundaryCustom } from '@thedaviddias/design-system/error-boundary'
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@thedaviddias/design-system/select'
import { Grid, List } from 'lucide-react'
import { useState, useEffect } from 'react'
import { LLMGrid } from './llm/llm-grid'
import { useWebsiteFilters } from '@/hooks/use-website-filters'

interface ClientProjectsListProps {
  initialWebsites: WebsiteMetadata[]
}

/**
 * Type guard to validate WebsiteMetadata objects
 *
 * @param website - Object to validate
 * @returns True if object is a valid WebsiteMetadata
 */
function isValidWebsite(website: any): website is WebsiteMetadata {
  return (
    website &&
    typeof website.slug === 'string' &&
    typeof website.name === 'string' &&
    typeof website.description === 'string' &&
    typeof website.website === 'string' &&
    typeof website.llmsUrl === 'string'
  )
}

/**
 * Client-side component for displaying and filtering a list of websites
 *
 * @param props - Component props
 * @param props.initialWebsites - Initial list of websites to display
 *
 * @returns React component with filtering, sorting, and view mode controls
 *
 * @example
 * ```tsx
 * <ClientProjectsList initialWebsites={websites} />
 * ```
 */
export function ClientProjectsList({ initialWebsites }: ClientProjectsListProps) {
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid')
  const [websites, setWebsites] = useState(initialWebsites)
  const { categoryFilter, sortBy, setCategoryFilter, setSortBy } = useWebsiteFilters()

  // Get current category name for heading
  const currentCategoryName =
    categoryFilter === 'all'
      ? 'All LLMs Websites'
      : `${categories.find(cat => cat.slug === categoryFilter)?.name || 'Unknown'} Websites`

  // Update filtered and sorted websites when filters or initial websites change
  useEffect(() => {
    let filteredWebsites = [...initialWebsites]

    // Filter by category if selected
    if (categoryFilter !== 'all') {
      filteredWebsites = filteredWebsites.filter(website => website.category === categoryFilter)
    }

    // Sort by selected criteria
    if (sortBy === 'latest') {
      filteredWebsites.sort(
        (a, b) => new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime()
      )
    } else if (sortBy === 'name') {
      filteredWebsites.sort((a, b) => a.name.localeCompare(b.name))
    }

    // Validate websites after all filtering and sorting
    const validWebsites = filteredWebsites.filter(isValidWebsite)
    setWebsites(validWebsites)
  }, [initialWebsites, categoryFilter, sortBy])

  return (
    <div>
      <h1 className="text-4xl font-bold tracking-tight mb-8">{currentCategoryName}</h1>
      <div className="flex justify-between items-center mb-4">
        <div className="flex items-center space-x-2">
          <Button
            variant={viewMode === 'grid' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setViewMode('grid')}
          >
            <Grid className="h-4 w-4" />
          </Button>
          <Button
            variant={viewMode === 'list' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setViewMode('list')}
          >
            <List className="h-4 w-4" />
          </Button>
        </div>
        <div className="flex items-center space-x-2">
          <Select value={categoryFilter} onValueChange={setCategoryFilter}>
            <SelectTrigger className="h-10 px-3 py-2 text-sm bg-background border rounded-md border-input hover:bg-accent hover:text-accent-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2">
              <SelectValue className="text-sm" placeholder="Filter by Category" />
            </SelectTrigger>
            <SelectContent
              className="z-50 min-w-[180px] overflow-hidden rounded-md border bg-popover text-popover-foreground shadow-md data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95"
              position="popper"
            >
              <SelectGroup className="p-3">
                <SelectItem value="all">All Categories</SelectItem>
                {categories.map(category => (
                  <SelectItem key={category.slug} value={category.slug}>
                    {category.name}
                  </SelectItem>
                ))}
              </SelectGroup>
            </SelectContent>
          </Select>
          <Select value={sortBy} onValueChange={setSortBy}>
            <SelectTrigger className="w-[180px] h-10 px-3 py-2 text-sm bg-background border rounded-md border-input hover:bg-accent hover:text-accent-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2">
              <SelectValue className="text-sm" placeholder="Sort by" />
            </SelectTrigger>
            <SelectContent
              className="z-50 min-w-[180px] overflow-hidden rounded-md border bg-popover text-popover-foreground shadow-md data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95"
              position="popper"
            >
              <SelectGroup className="p-3">
                <SelectItem value="latest">Latest</SelectItem>
                <SelectItem value="name">Name</SelectItem>
              </SelectGroup>
            </SelectContent>
          </Select>
        </div>
      </div>
      {websites.length === 0 ? (
        <EmptyState
          title="No websites found"
          description="There are no websites matching your current filters. Try adjusting your filters or add a new website."
          actionLabel="Submit llms.txt"
          actionHref={getRoute('submit')}
        />
      ) : viewMode === 'grid' ? (
        <ErrorBoundaryCustom>
          <h2 className="text-2xl font-semibold mb-6 sr-only">Websites list</h2>
          <LLMGrid items={websites} />
        </ErrorBoundaryCustom>
      ) : (
        <ErrorBoundaryCustom>
          <h2 className="text-2xl font-semibold mb-6 sr-only">Websites list</h2>
          <ProjectList items={websites} />
        </ErrorBoundaryCustom>
      )}
    </div>
  )
}
