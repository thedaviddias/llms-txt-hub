'use client'

import { Badge } from '@thedaviddias/design-system/badge'
import { cn } from '@thedaviddias/design-system/lib/utils'
import Link from 'next/link'
import { Card } from '@/components/ui/card'
import { FaviconWithFallback } from '@/components/ui/favicon-with-fallback'
import { FavoriteButton } from '@/components/ui/favorite-button'
import type { WebsiteMetadata } from '@/lib/content-loader'
import { getRoute } from '@/lib/routes'
import { stripHtmlTags } from '@/lib/utils'

interface LLMGridProps {
  items: WebsiteMetadata[]
  variant?: 'default' | 'compact'
  className?: string
  maxItems?: number
  animateIn?: boolean
  analyticsSource?: string
  overrideGrid?: boolean
}

/**
 * Grid component for displaying LLM/website items with favorites functionality
 * Features: Staggered fade-in animations, hover lift effects, responsive grid
 */
export function LLMGrid({
  items = [],
  variant = 'default',
  className,
  maxItems,
  animateIn = true,
  analyticsSource,
  overrideGrid = false
}: LLMGridProps) {
  if (!items?.length) {
    return null
  }

  /**
   * Get stagger animation class based on index (capped at 8)
   * @param index - The item index
   * @returns The stagger class name
   */
  const getStaggerClass = (index: number) => {
    const staggerIndex = Math.min(index, 7) + 1
    return `stagger-${staggerIndex}`
  }

  if (variant === 'compact') {
    return (
      <div className={cn('space-y-4', className)}>
        {items.map((item, index) => {
          if (!item?.slug) return null
          return (
            <div
              className={cn(
                'flex items-center gap-3 p-2 sm:p-2.5 rounded-lg transition-all duration-200 relative',
                'hover:bg-muted/50 hover:translate-x-1',
                animateIn && 'animate-fade-in-up opacity-0',
                animateIn && getStaggerClass(index)
              )}
              key={item.slug}
            >
              <FaviconWithFallback website={item.website} name={item.name} size={32} />
              <div className="flex-1 min-w-0 space-y-1">
                <div className="flex items-center gap-2">
                  <h3 className="font-semibold text-xs sm:text-sm md:text-base truncate">
                    <Link
                      href={getRoute('website.detail', { slug: item.slug })}
                      className="block after:absolute after:inset-0 after:content-[''] z-10"
                      data-analytics="website-click"
                      data-website-name={item.name}
                      data-website-slug={item.slug}
                      data-source={analyticsSource || 'grid-compact'}
                    >
                      {item.name}
                    </Link>
                  </h3>
                  {item.isUnofficial && (
                    <Badge
                      variant="outline"
                      className="text-xs border-yellow-500/20 bg-yellow-500/10 dark:border-yellow-400/30 dark:bg-yellow-400/10 text-yellow-700 dark:text-yellow-300 hover:bg-yellow-500/20 dark:hover:bg-yellow-400/20 transition-colors"
                    >
                      Unofficial
                    </Badge>
                  )}
                </div>
                <p className="text-xs sm:text-sm text-muted-foreground">
                  {stripHtmlTags(item.description)}
                </p>
              </div>
              <div className="flex-shrink-0 ml-2">
                <FavoriteButton slug={item.slug} size="sm" variant="ghost" />
              </div>
            </div>
          )
        })}
      </div>
    )
  }

  return (
    <div
      className={
        overrideGrid
          ? className
          : cn(
              'grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6 4xl:grid-cols-8 gap-4',
              className
            )
      }
    >
      {items.map((item, index) => {
        if (!item?.slug) return null

        const isVisible = !maxItems || index < maxItems
        // Hide items 7 and 8 (index 6, 7) on screens smaller than 4xl
        const isExtraItem = index >= 6

        return (
          <div
            key={item.slug}
            className={cn(
              'transition-all duration-300 ease-out',
              isVisible ? 'scale-100' : 'scale-95 absolute pointer-events-none',
              animateIn && isVisible && 'animate-fade-in-up opacity-0',
              animateIn && isVisible && getStaggerClass(index),
              isExtraItem && 'hidden 4xl:block'
            )}
          >
            <Card className="p-4 relative h-full group">
              <div className="space-y-1.5">
                <div className="space-y-1.5 sm:space-y-2">
                  <div className="flex items-start justify-between">
                    <FaviconWithFallback website={item.website} name={item.name} size={32} />
                    <FavoriteButton slug={item.slug} size="sm" variant="default" />
                  </div>
                  <div className="flex items-center gap-2">
                    <h3 className="font-bold text-xs sm:text-sm md:text-base truncate">
                      <Link
                        href={getRoute('website.detail', { slug: item.slug })}
                        className="block after:absolute after:inset-0 after:content-[''] z-10"
                        data-analytics="website-click"
                        data-website-name={item.name}
                        data-website-slug={item.slug}
                        data-source={analyticsSource || 'grid-default'}
                      >
                        {item.name}
                      </Link>
                    </h3>
                    {item.isUnofficial && (
                      <Badge
                        variant="outline"
                        className="text-xs border-yellow-500/20 bg-yellow-500/10 dark:border-yellow-400/30 dark:bg-yellow-400/10 text-yellow-700 dark:text-yellow-300 hover:bg-yellow-500/20 dark:hover:bg-yellow-400/20 transition-colors"
                      >
                        Unofficial
                      </Badge>
                    )}
                  </div>
                  <p className="text-xs sm:text-sm text-muted-foreground line-clamp-2">
                    {stripHtmlTags(item.description)}
                  </p>
                </div>
              </div>
            </Card>
          </div>
        )
      })}
    </div>
  )
}
