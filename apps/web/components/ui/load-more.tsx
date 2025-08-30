'use client'

import { Button } from '@thedaviddias/design-system/button'
import { ChevronDown, Loader2 } from 'lucide-react'
import { useEffect, useState } from 'react'
import { analytics } from '@/lib/analytics'

interface LoadMoreProps {
  onLoadMore: () => Promise<void> | void
  hasMore: boolean
  isLoading?: boolean
  loadMoreText?: string
  noMoreText?: string
  showItemsCount?: number
  totalItemsCount?: number
  className?: string
  variant?: 'button' | 'auto' | 'scroll'
  threshold?: number
  analyticsSource?: string
  analyticsContentType?: 'websites' | 'members'
}

export function LoadMore({
  onLoadMore,
  hasMore,
  isLoading = false,
  loadMoreText = 'Show More',
  noMoreText = 'No more items',
  showItemsCount,
  totalItemsCount,
  className = '',
  variant = 'button',
  threshold = 200,
  analyticsSource,
  analyticsContentType
}: LoadMoreProps) {
  const [isClient, setIsClient] = useState(false)

  useEffect(() => {
    setIsClient(true)
  }, [])

  // Auto-load when scrolling near bottom
  useEffect(() => {
    if (!isClient || variant !== 'scroll' || !hasMore || isLoading) return

    const handleScroll = () => {
      const scrollHeight = document.documentElement.scrollHeight
      const scrollTop = document.documentElement.scrollTop
      const clientHeight = document.documentElement.clientHeight

      if (scrollHeight - scrollTop - clientHeight < threshold) {
        onLoadMore()
      }
    }

    window.addEventListener('scroll', handleScroll, { passive: true })
    return () => window.removeEventListener('scroll', handleScroll)
  }, [isClient, variant, hasMore, isLoading, threshold, onLoadMore])

  // Auto-load immediately when component mounts
  useEffect(() => {
    if (!isClient || variant !== 'auto' || !hasMore || isLoading) return

    const timer = setTimeout(() => {
      onLoadMore()
    }, 100)

    return () => clearTimeout(timer)
  }, [isClient, variant, hasMore, isLoading, onLoadMore])

  if (!hasMore && variant === 'scroll') {
    return null
  }

  if (!hasMore && variant === 'auto') {
    return (
      <div className={`text-center py-4 ${className}`}>
        <p className="text-sm text-muted-foreground">{noMoreText}</p>
      </div>
    )
  }

  if (variant === 'button' || !hasMore) {
    return (
      <div className={`text-center py-6 ${className}`}>
        {hasMore ? (
          <div className="space-y-3">
            {showItemsCount && totalItemsCount && (
              <p className="text-sm text-muted-foreground">
                Showing {showItemsCount} of {totalItemsCount} items
              </p>
            )}
            <Button
              onClick={() => {
                // Track load more event
                if (analyticsContentType && showItemsCount && totalItemsCount) {
                  analytics.loadMore(
                    analyticsContentType,
                    showItemsCount,
                    totalItemsCount,
                    analyticsSource
                  )
                }
                onLoadMore()
              }}
              variant="outline"
              disabled={isLoading}
              className="min-w-[140px] transition-all duration-300 hover:scale-105"
            >
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Loading...
                </>
              ) : (
                <>
                  <ChevronDown className="mr-2 h-4 w-4 transition-transform duration-300" />
                  {loadMoreText}
                </>
              )}
            </Button>
          </div>
        ) : (
          <div className="space-y-2">
            {showItemsCount && totalItemsCount && (
              <p className="text-sm text-muted-foreground">Showing all {totalItemsCount} items</p>
            )}
            <p className="text-sm text-muted-foreground">{noMoreText}</p>
          </div>
        )}
      </div>
    )
  }

  // For scroll and auto variants, show loading indicator when loading
  if (isLoading) {
    return (
      <div className={`text-center py-6 ${className}`}>
        <div className="flex items-center justify-center gap-2">
          <Loader2 className="h-4 w-4 animate-spin" />
          <span className="text-sm text-muted-foreground">Loading more...</span>
        </div>
      </div>
    )
  }

  return null
}
