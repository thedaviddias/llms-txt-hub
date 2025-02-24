'use client'

import { EmptyState } from '@/components/empty-state'
import { ProjectList } from '@/components/project-list'
import type { WebsiteMetadata } from '@/lib/mdx'
import { getRoute } from '@/lib/routes'
import { Button } from '@thedaviddias/design-system/button'
import { ErrorBoundaryCustom } from '@thedaviddias/design-system/error-boundary'
import { Grid, List } from 'lucide-react'
import { useSearchParams } from 'next/navigation'
import { useState } from 'react'
import { LLMGrid } from './llm/llm-grid'

interface ClientProjectsListProps {
  initialWebsites: WebsiteMetadata[]
}

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

export function ClientProjectsList({ initialWebsites }: ClientProjectsListProps) {
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid')
  const [sortBy, setSortBy] = useState('latest')
  const [websites, setWebsites] = useState(initialWebsites)
  const searchParams = useSearchParams()
  const filter = searchParams.get('filter')
  const [categoryFilter, setCategoryFilter] = useState('all')

  // useEffect(() => {
  //   let filteredWebsites = [...initialWebsites]

  //   if (filter === 'featured') {
  //     filteredWebsites = filteredWebsites.filter(website => website.score > 50)
  //   } else if (filter === 'latest') {
  //     filteredWebsites.sort(
  //       (a, b) => new Date(b.lastUpdated).getTime() - new Date(a.lastUpdated).getTime()
  //     )
  //   }

  //   if (categoryFilter !== 'all') {
  //     filteredWebsites = filteredWebsites.filter(website => website.category === categoryFilter)
  //   }

  //   if (sortBy === 'latest') {
  //     filteredWebsites.sort(
  //       (a, b) => new Date(b.lastUpdated).getTime() - new Date(a.lastUpdated).getTime()
  //     )
  //   } else if (sortBy === 'name') {
  //     filteredWebsites.sort((a, b) => a.name.localeCompare(b.name))
  //   }

  //   // Validate websites after all filtering and sorting
  //   const validWebsites = filteredWebsites.filter(isValidWebsite)
  //   setWebsites(validWebsites)
  // }, [initialWebsites, filter, sortBy, categoryFilter])

  return (
    <div>
      <h2 className="text-2xl font-semibold mb-6">Browse Projects</h2>
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
        {/* <div className="flex items-center space-x-2">
          <Select value={categoryFilter} onValueChange={setCategoryFilter}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Filter by Category" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Categories</SelectItem>
              {categories.map(category => (
                <SelectItem key={category.slug} value={category.slug}>
                  {category.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={sortBy} onValueChange={setSortBy}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Sort by" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="latest">Latest</SelectItem>
              <SelectItem value="name">Name</SelectItem>
            </SelectContent>
          </Select>
        </div> */}
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
          <LLMGrid items={websites} />
        </ErrorBoundaryCustom>
      ) : (
        <ErrorBoundaryCustom>
          <ProjectList items={websites} />
        </ErrorBoundaryCustom>
      )}
    </div>
  )
}
