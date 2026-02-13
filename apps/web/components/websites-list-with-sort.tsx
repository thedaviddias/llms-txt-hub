'use client'

import { Badge } from '@thedaviddias/design-system/badge'
import { ToggleGroup, ToggleGroupItem } from '@thedaviddias/design-system/toggle-group'
import { Clock, SortAsc } from 'lucide-react'
import Link from 'next/link'
import { useEffect, useMemo, useState } from 'react'
import { useAnalyticsEvents } from '@/components/analytics-tracker'
import { EmptyState } from '@/components/empty-state'
import { Card } from '@/components/ui/card'
import { FaviconWithFallback } from '@/components/ui/favicon-with-fallback'
import type { WebsiteMetadata } from '@/lib/content-loader'
import { getRoute } from '@/lib/routes'
import { stripHtmlTags } from '@/lib/utils'

interface WebsitesListWithSortProps {
  initialWebsites: WebsiteMetadata[]
  emptyTitle?: string
  emptyDescription?: string
  categoryType?: 'tool' | 'non-tool'
}

/**
 * Client component that handles sorting on the client side
 * Initial data is server-side sorted, then client can re-sort
 */
export function WebsitesListWithSort({
  initialWebsites,
  emptyTitle = 'No websites found',
  emptyDescription = 'There are no websites available. Try checking back later or submit a new website.',
  categoryType = 'non-tool'
}: WebsitesListWithSortProps) {
  const [sortBy, setSortBy] = useState<'name' | 'latest'>('name')
  const [isClient, setIsClient] = useState(false)
  const { trackSortChange } = useAnalyticsEvents()

  // Load saved sort preference
  useEffect(() => {
    setIsClient(true)
    const savedSortBy = localStorage.getItem('category-sort-by')
    if (savedSortBy && (savedSortBy === 'name' || savedSortBy === 'latest')) {
      setSortBy(savedSortBy)
    }
  }, [])

  // Save sort preference
  useEffect(() => {
    if (isClient) {
      localStorage.setItem('category-sort-by', sortBy)
    }
  }, [sortBy, isClient])

  const sortedWebsites = useMemo(() => {
    const websites = [...initialWebsites]
    if (sortBy === 'latest') {
      // Sort by publishedAt date, most recent first
      return websites.sort((a, b) => {
        const dateA = new Date(a.publishedAt).getTime()
        const dateB = new Date(b.publishedAt).getTime()
        return dateB - dateA // Newer dates first
      })
    } else {
      // Sort alphabetically by name
      return websites.sort((a, b) => a.name.localeCompare(b.name))
    }
  }, [initialWebsites, sortBy])

  /**
   * Renders a single website card
   */
  const renderWebsite = (website: WebsiteMetadata) => (
    <Card
      key={website.slug}
      className="p-4 hover:bg-muted/50 transition-all duration-300 relative h-full hover:shadow-md"
    >
      <div className="space-y-3">
        <div className="space-y-2">
          <FaviconWithFallback website={website.website} name={website.name} size={32} />
          <div className="flex items-center gap-2">
            <h3 className="font-semibold">
              <Link
                href={getRoute('website.detail', { slug: website.slug })}
                className="block after:absolute after:inset-0 after:content-[''] z-10 hover:text-primary transition-colors"
              >
                {website.name}
              </Link>
            </h3>
            {website.isUnofficial && (
              <Badge
                variant="outline"
                className="text-xs border-muted-foreground/20 bg-muted/50 text-muted-foreground hover:bg-muted transition-colors"
              >
                Unofficial
              </Badge>
            )}
          </div>
          <p className="text-sm text-muted-foreground line-clamp-2">
            {stripHtmlTags(website.description)}
          </p>
        </div>
      </div>
    </Card>
  )

  const emptyState = (
    <EmptyState
      title={emptyTitle}
      description={emptyDescription}
      actionLabel="Add Your your llms.txt"
      actionHref={getRoute('submit')}
    />
  )

  return (
    <div className="space-y-6">
      {/* Count and Sort Controls */}
      <div className="flex justify-between items-center">
        <div className="text-sm text-muted-foreground">
          {initialWebsites.length > 0 && (
            <>
              Showing {sortedWebsites.length} {categoryType === 'tool' ? 'tools' : 'websites'} in
              this category
            </>
          )}
        </div>

        <div className="flex items-center gap-2">
          <span className="text-sm text-muted-foreground">Sort by:</span>
          <ToggleGroup
            type="single"
            value={sortBy}
            onValueChange={(value: string) => {
              if (value && value !== sortBy) {
                // Track sort change
                trackSortChange(sortBy, value, 'category-sort')
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

      {/* Results Grid */}
      {sortedWebsites.length === 0 ? (
        emptyState
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6 4xl:grid-cols-8 gap-4">
          {sortedWebsites.map(website => renderWebsite(website))}
        </div>
      )}
    </div>
  )
}
