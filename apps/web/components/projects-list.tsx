'use client'

import { Button } from '@thedaviddias/design-system/button'
import { ErrorBoundaryCustom } from '@thedaviddias/design-system/error-boundary'
import {} from '@thedaviddias/design-system/select'
import { ToggleGroup, ToggleGroupItem } from '@thedaviddias/design-system/toggle-group'
import { Clock, Grid, List, SortAsc } from 'lucide-react'
import { useEffect, useState } from 'react'
import { EmptyState } from '@/components/empty-state'
import { ProjectList } from '@/components/project-list'
import { useWebsiteFilters } from '@/hooks/use-website-filters'
import { categories } from '@/lib/categories'
import type { WebsiteMetadata } from '@/lib/content-loader'
import { getRoute } from '@/lib/routes'
import { LLMGrid } from './llm/llm-grid'

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
  const isValid =
    website &&
    typeof website.slug === 'string' &&
    typeof website.name === 'string' &&
    typeof website.description === 'string' &&
    typeof website.website === 'string' &&
    typeof website.llmsUrl === 'string' &&
    typeof website.category === 'string' &&
    typeof website.publishedAt === 'string'

  return isValid
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
  const {
    categoryFilter,
    sortBy,
    contentTypeFilter,
    setCategoryFilter,
    setSortBy,
    setContentTypeFilter
  } = useWebsiteFilters()

  // Get current category name for heading
  const currentCategoryName =
    categoryFilter === 'all'
      ? 'All LLMs Websites'
      : `${categories.find(cat => cat.slug === categoryFilter)?.name || 'Unknown'} Websites`

  // Update filtered and sorted websites when filters or initial websites change
  useEffect(() => {
    let filteredWebsites = [...initialWebsites]

    // Filter by content type
    if (contentTypeFilter === 'tools') {
      filteredWebsites = filteredWebsites.filter(
        website =>
          website.contentType === 'tool' ||
          website.contentType === 'platform' ||
          website.contentType === 'library'
      )
    } else if (contentTypeFilter === 'personal') {
      filteredWebsites = filteredWebsites.filter(website => website.contentType === 'personal')
    }

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
  }, [initialWebsites, categoryFilter, sortBy, contentTypeFilter])

  return (
    <div>
      <h1 className="text-4xl font-bold tracking-tight mb-4">{currentCategoryName}</h1>

      <div className="mb-8">
        <div className="flex flex-wrap gap-2 mb-4">
          <Button
            variant={contentTypeFilter === 'all' ? 'default' : 'secondary'}
            size="sm"
            onClick={() => setContentTypeFilter('all')}
            className="rounded-full hover:cursor-pointer"
          >
            All Types
          </Button>
          <Button
            variant={contentTypeFilter === 'tools' ? 'default' : 'secondary'}
            size="sm"
            onClick={() => setContentTypeFilter('tools')}
            className="rounded-full hover:cursor-pointer"
          >
            Tools & Platforms
          </Button>
          <Button
            variant={contentTypeFilter === 'personal' ? 'default' : 'secondary'}
            size="sm"
            onClick={() => setContentTypeFilter('personal')}
            className="rounded-full hover:cursor-pointer"
          >
            Personal Sites
          </Button>
        </div>

        <div className="flex flex-wrap gap-2">
          <Button
            variant={categoryFilter === 'all' ? 'default' : 'secondary'}
            size="sm"
            onClick={() => setCategoryFilter('all')}
            className="rounded-full hover:cursor-pointer"
          >
            All Categories
          </Button>
          {categories.map(category => (
            <Button
              key={category.slug}
              variant={categoryFilter === category.slug ? 'default' : 'secondary'}
              size="sm"
              onClick={() => setCategoryFilter(category.slug)}
              className="rounded-full hover:cursor-pointer"
            >
              {category.name}
            </Button>
          ))}
        </div>
      </div>

      <div className="flex justify-between items-center mb-4">
        <div className="flex items-center space-x-2">
          <Button
            variant={viewMode === 'grid' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setViewMode('grid')}
            className="hover:cursor-pointer"
          >
            <Grid className="size-4" />
          </Button>
          <Button
            variant={viewMode === 'list' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setViewMode('list')}
            className="hover:cursor-pointer"
          >
            <List className="size-4" />
          </Button>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-sm text-muted-foreground">Sort by:</span>
          <ToggleGroup
            type="single"
            value={sortBy}
            onValueChange={(value: string) => value && setSortBy(value)}
            className="bg-background border rounded-md"
          >
            <ToggleGroupItem value="latest" className="px-3 py-2 h-10 data-[state=on]:bg-accent">
              <Clock className="size-4 mr-2" />
              <span className="text-sm">Latest</span>
            </ToggleGroupItem>
            <ToggleGroupItem value="name" className="px-3 py-2 h-10 data-[state=on]:bg-accent">
              <SortAsc className="size-4 mr-2" />
              <span className="text-sm">Name</span>
            </ToggleGroupItem>
          </ToggleGroup>
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
