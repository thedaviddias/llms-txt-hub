import type { WebsiteMetadata } from '@/lib/mdx'
import { getRoute } from '@/lib/routes'
import { Card } from '@thedaviddias/design-system/card'
import { cn } from '@thedaviddias/design-system/lib/utils'
import { getFaviconUrl } from '@thedaviddias/utils/get-favicon-url'
import Link from 'next/link'
import { LLMButton } from '../buttons/llm-button'
import { Badge } from '@thedaviddias/design-system/badge'

interface LLMGridProps {
  items: WebsiteMetadata[]
  variant?: 'default' | 'compact'
  className?: string
}

export function LLMGrid({ items = [], variant = 'default', className }: LLMGridProps) {
  if (!items?.length) {
    return null
  }

  if (variant === 'compact') {
    return (
      <div className={cn('space-y-4', className)}>
        {items.map(item => {
          if (!item?.slug) return null
          return (
            <div
              className="flex items-center gap-4 p-3 rounded-lg hover:bg-muted/50 transition-colors relative"
              key={item.slug}
            >
              <img
                src={getFaviconUrl(item.website) || '/placeholder.svg'}
                alt={`${item.name} logo`}
                width={32}
                height={32}
                className="rounded-lg"
              />
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <h3 className="font-medium truncate">
                    <Link
                      href={getRoute('website.detail', { slug: item.slug })}
                      className="block after:absolute after:inset-0 after:content-[''] z-10"
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
                <p className="text-sm text-muted-foreground truncate">{item.description}</p>
                <div className="pt-2 space-x-2">
                  {item.llmsUrl && <LLMButton href={item.llmsUrl} type="llms" size="sm" />}
                  {item.llmsFullUrl && (
                    <LLMButton href={item.llmsFullUrl} type="llms-full" size="sm" />
                  )}
                </div>
              </div>
            </div>
          )
        })}
      </div>
    )
  }

  return (
    <div className={cn('grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4', className)}>
      {items.map(item => {
        return (
          <Card key={item.slug} className="p-6 hover:bg-muted/50 transition-colors relative">
            <div className="space-y-4">
              <div className="space-y-3">
                <div className="flex items-start justify-between">
                  <img
                    src={getFaviconUrl(item.website) || '/placeholder.svg'}
                    alt={`${item.name} logo`}
                    width={32}
                    height={32}
                    className="rounded-lg"
                  />
                </div>
                <div className="flex items-center gap-2">
                  <h3 className="font-semibold">
                    <Link
                      href={getRoute('website.detail', { slug: item.slug })}
                      className="block after:absolute after:inset-0 after:content-[''] z-10"
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
                <p className="text-sm text-muted-foreground line-clamp-2">{item.description}</p>
              </div>
              <div className="pt-2 space-x-2">
                {item.llmsUrl && <LLMButton href={item.llmsUrl} type="llms" size="sm" />}
                {item.llmsFullUrl && (
                  <LLMButton href={item.llmsFullUrl} type="llms-full" size="sm" />
                )}
              </div>
            </div>
          </Card>
        )
      })}
    </div>
  )
}
