import { FavoriteButton } from '@/components/favorite-button'
import { LLMButton } from '@/components/llm-button'
import { cn } from '@/lib/utils'
import { Card } from '@thedaviddias/design-system/card'
import Image from 'next/image'
import Link from 'next/link'

interface LLMItem {
  name: string
  description: string
  website: string
  llmsUrl: string
  llmsFullUrl?: string
  slug: string
  favorites: number
}

interface LLMGridProps {
  items: LLMItem[]
  variant?: 'default' | 'compact'
  className?: string
}

function getFaviconUrl(website: string) {
  const domain = new URL(website).hostname
  return `https://www.google.com/s2/favicons?sz=32&domain=${domain}`
}

export function LLMGrid({ items, variant = 'default', className }: LLMGridProps) {
  if (variant === 'compact') {
    return (
      <div className={cn('space-y-4', className)}>
        {items.map((item) => (
          <Link key={item.slug} href={`/project/${item.slug}`} className="block">
            <div className="flex items-center gap-4 p-3 rounded-lg hover:bg-muted/50 transition-colors">
              <Image
                src={getFaviconUrl(item.website) || '/placeholder.svg'}
                alt={`${item.name} logo`}
                width={32}
                height={32}
                className="rounded-lg"
              />
              <div className="flex-1 min-w-0">
                <h3 className="font-medium truncate">{item.name}</h3>
                <p className="text-sm text-muted-foreground truncate">{item.description}</p>
              </div>
            </div>
          </Link>
        ))}
      </div>
    )
  }

  return (
    <div className={cn('grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4', className)}>
      {items.map((item) => (
        <Card key={item.slug} className="p-6 hover:bg-muted/50 transition-colors">
          <Link href={`/project/${item.slug}`} className="block">
            <div className="space-y-4">
              <div className="space-y-3">
                <div className="flex items-start justify-between">
                  <Image
                    src={getFaviconUrl(item.website) || '/placeholder.svg'}
                    alt={`${item.name} logo`}
                    width={32}
                    height={32}
                    className="rounded-lg"
                  />
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-muted-foreground">{item.favorites}</span>
                    <FavoriteButton projectSlug={item.slug} initialFavorites={item.favorites} />
                  </div>
                </div>
                <h3 className="font-semibold">{item.name}</h3>
                <p className="text-sm text-muted-foreground line-clamp-2">{item.description}</p>
              </div>
              <div className="pt-2 space-x-2">
                <LLMButton href={item.llmsUrl} type="llms" size="sm" />
                {item.llmsFullUrl && (
                  <LLMButton href={item.llmsFullUrl} type="llms-full" size="sm" />
                )}
              </div>
            </div>
          </Link>
        </Card>
      ))}
    </div>
  )
}
