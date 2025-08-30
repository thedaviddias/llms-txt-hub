'use client'

import { useLoadMore } from '@/hooks/use-load-more'
import { LoadMore } from './load-more'

interface PaginatedContentProps<T> {
  items: T[]
  renderItem: (item: T, index: number) => React.ReactNode
  initialItemsPerPage?: number
  itemsPerLoad?: number
  loadMoreVariant?: 'button' | 'auto' | 'scroll'
  loadMoreText?: string
  noMoreText?: string
  containerClassName?: string
  itemsClassName?: string
  emptyState?: React.ReactNode
  threshold?: number
}

export function PaginatedContent<T>({
  items,
  renderItem,
  initialItemsPerPage = 12,
  itemsPerLoad = 12,
  loadMoreVariant = 'button',
  loadMoreText = 'Load more',
  noMoreText = 'All items loaded',
  containerClassName = '',
  itemsClassName = 'grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4',
  emptyState,
  threshold = 200
}: PaginatedContentProps<T>) {
  const { displayedItems, hasMore, isLoading, loadMore, showItemsCount, totalItemsCount } =
    useLoadMore({
      items,
      initialItemsPerPage,
      itemsPerLoad
    })

  if (items.length === 0 && emptyState) {
    return <div className={containerClassName}>{emptyState}</div>
  }

  return (
    <div className={containerClassName}>
      {/* Items Grid/List */}
      <div className={itemsClassName}>
        {displayedItems.map((item, index) => renderItem(item, index))}
      </div>

      {/* Load More Component */}
      {(hasMore || loadMoreVariant !== 'scroll') && (
        <LoadMore
          onLoadMore={loadMore}
          hasMore={hasMore}
          isLoading={isLoading}
          loadMoreText={loadMoreText}
          noMoreText={noMoreText}
          showItemsCount={showItemsCount}
          totalItemsCount={totalItemsCount}
          variant={loadMoreVariant}
          threshold={threshold}
        />
      )}
    </div>
  )
}

// Convenience wrapper for common website grid layout
export function WebsitesPaginatedGrid<T>({
  items,
  renderItem,
  ...props
}: Omit<PaginatedContentProps<T>, 'itemsClassName'> & {
  items: T[]
  renderItem: (item: T, index: number) => React.ReactNode
}) {
  return (
    <PaginatedContent
      items={items}
      renderItem={renderItem}
      itemsClassName="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6 gap-4"
      {...props}
    />
  )
}
