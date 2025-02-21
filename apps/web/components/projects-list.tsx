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
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@thedaviddias/design-system/select'
import { Grid, List } from 'lucide-react'
import { useSearchParams } from 'next/navigation'
import { useEffect, useState } from 'react'
import { LLMGrid } from './llm/llm-grid'

interface ClientProjectsListProps {
  initialProjects: WebsiteMetadata[]
}

function isValidProject(project: any): project is WebsiteMetadata {
  return (
    project &&
    typeof project.slug === 'string' &&
    typeof project.name === 'string' &&
    typeof project.description === 'string' &&
    typeof project.website === 'string' &&
    typeof project.llmsUrl === 'string'
  )
}

export function ClientProjectsList({ initialProjects }: ClientProjectsListProps) {
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid')
  const [sortBy, setSortBy] = useState('latest')
  const [projects, setProjects] = useState(initialProjects)
  const searchParams = useSearchParams()
  const filter = searchParams.get('filter')
  const [categoryFilter, setCategoryFilter] = useState('all')

  useEffect(() => {
    let filteredProjects = [...initialProjects]

    if (filter === 'featured') {
      filteredProjects = filteredProjects.filter(project => project.score > 50)
    } else if (filter === 'latest') {
      filteredProjects.sort(
        (a, b) => new Date(b.lastUpdated).getTime() - new Date(a.lastUpdated).getTime()
      )
    }

    if (categoryFilter !== 'all') {
      filteredProjects = filteredProjects.filter(project => project.category === categoryFilter)
    }

    if (sortBy === 'latest') {
      filteredProjects.sort(
        (a, b) => new Date(b.lastUpdated).getTime() - new Date(a.lastUpdated).getTime()
      )
    } else if (sortBy === 'name') {
      filteredProjects.sort((a, b) => a.name.localeCompare(b.name))
    }

    // Validate projects after all filtering and sorting
    const validProjects = filteredProjects.filter(isValidProject)
    setProjects(validProjects)
  }, [initialProjects, filter, sortBy, categoryFilter])

  return (
    <div>
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
        </div>
      </div>
      {projects.length === 0 ? (
        <EmptyState
          title="No projects found"
          description="There are no projects matching your current filters. Try adjusting your filters or add a new project."
          actionLabel="Submit llms.txt"
          actionHref={getRoute('submit')}
        />
      ) : viewMode === 'grid' ? (
        <ErrorBoundaryCustom>
          <LLMGrid items={projects} />
        </ErrorBoundaryCustom>
      ) : (
        <ErrorBoundaryCustom>
          <ProjectList items={projects} />
        </ErrorBoundaryCustom>
      )}
    </div>
  )
}
