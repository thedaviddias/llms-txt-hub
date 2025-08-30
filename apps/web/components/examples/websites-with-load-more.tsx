'use client'

import { EmptyState } from '@/components/empty-state'
import { Card } from '@/components/ui/card'
import { FaviconWithFallback } from '@/components/ui/favicon-with-fallback'
import { WebsitesPaginatedGrid } from '@/components/ui/paginated-content'
import type { WebsiteMetadata } from '@/lib/content-loader'
import { getRoute } from '@/lib/routes'
import { Badge } from '@thedaviddias/design-system/badge'
import Link from 'next/link'

interface WebsitesWithLoadMoreProps {
  websites: WebsiteMetadata[]
  variant?: 'button' | 'auto' | 'scroll'
  initialItemsPerPage?: number
  itemsPerLoad?: number
}

/**
 * Displays a grid of websites with load more functionality
 * @param props - The component props
 * @returns React component with paginated website grid
 */
export function WebsitesWithLoadMore({
  websites,
  variant = 'button',
  initialItemsPerPage = 18,
  itemsPerLoad = 18
}: WebsitesWithLoadMoreProps) {
  /**
   * Renders a single website card
   */
  const renderWebsite = (website: WebsiteMetadata, index: number) => (
    <div
      key={website.slug}
      className="transition-all duration-500 ease-in-out transform"
      style={{
        transitionDelay: `${Math.min(index * 30, 600)}ms`
      }}
    >
      <Card className="p-4 hover:bg-muted/50 transition-all duration-300 relative h-full hover:shadow-md">
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
            <p className="text-sm text-muted-foreground line-clamp-2">{website.description}</p>
          </div>
        </div>
      </Card>
    </div>
  )

  const emptyState = (
    <EmptyState
      title="No websites found"
      description="There are no websites available. Try checking back later or submit a new website."
      actionLabel="Submit llms.txt"
      actionHref={getRoute('submit')}
    />
  )

  return (
    <WebsitesPaginatedGrid
      items={websites}
      renderItem={renderWebsite}
      initialItemsPerPage={initialItemsPerPage}
      itemsPerLoad={itemsPerLoad}
      loadMoreVariant={variant}
      loadMoreText="Load more websites"
      noMoreText="All websites loaded"
      emptyState={emptyState}
      containerClassName="space-y-8"
      threshold={300}
    />
  )
}
