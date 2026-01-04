import { Badge } from '@thedaviddias/design-system/badge'
import { Breadcrumb } from '@thedaviddias/design-system/breadcrumb'
import { Button } from '@thedaviddias/design-system/button'
import { logger } from '@thedaviddias/logging'
import { getBaseUrl } from '@thedaviddias/utils/get-base-url'
import { getFaviconUrl } from '@thedaviddias/utils/get-favicon-url'
import { XMLParser } from 'fast-xml-parser'
import { ArrowRight, ExternalLink, Newspaper, Rss } from 'lucide-react'
import type { Metadata } from 'next'
import Image from 'next/image'
import Link from 'next/link'
import { RSS_FEED_URL } from '@/app/api/rss-feed/route'
import { Card, CardContent } from '@/components/ui/card'
import { generateBaseMetadata } from '@/lib/seo/seo-config'
import { extractDomain, formatDate, formatRelativeDate } from '@/lib/utils'

/**
 * Strips HTML tags from a string to create safe plain text
 *
 * @param html - The HTML string to sanitize
 * @returns Plain text with HTML tags removed
 */
function stripHtmlTags(html: string): string {
  if (!html) return ''
  return html.replace(/<[^>]*>/g, '').trim()
}

export const metadata: Metadata = generateBaseMetadata({
  title: 'llms.txt News & Updates - AI Documentation Standard Announcements',
  description:
    'Stay updated with the latest llms.txt news, specification updates, and community announcements. Follow the evolution of the llms.txt standard for AI-ready documentation.',
  path: '/news',
  keywords: [
    'llms.txt news',
    'llms.txt updates',
    'llms.txt announcements',
    'AI documentation news',
    'llms.txt standard updates',
    'llms.txt community'
  ]
})

interface NewsItem {
  title: string
  link: string
  pubDate: string
  description: string
}

/**
 * Fetch news items from the RSS feed
 *
 * @returns Promise containing an array of news items
 */
async function getNewsItems(): Promise<{ items: NewsItem[] }> {
  try {
    const response = await fetch(RSS_FEED_URL, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; RSS-Reader/1.0)'
      },
      next: { revalidate: 172800 }
    })

    if (!response.ok) {
      logger.error('Failed to fetch RSS feed:', {
        data: { status: response.status, statusText: response.statusText },
        tags: { type: 'page' }
      })
      return { items: [] }
    }

    const xmlData = await response.text()
    const parser = new XMLParser()
    const result = parser.parse(xmlData)

    if (!result?.rss?.channel?.item) {
      return { items: [] }
    }

    const items = Array.isArray(result.rss.channel.item)
      ? result.rss.channel.item
      : [result.rss.channel.item]

    return {
      items: items.map((item: any) => ({
        title: item.title || '',
        link: item.link || '',
        pubDate: item.pubDate || '',
        description: stripHtmlTags(item.description || '')
      }))
    }
  } catch (error) {
    logger.error('Error fetching news:', { data: error, tags: { type: 'page' } })
    return { items: [] }
  }
}

/**
 * Featured news card component for the latest article
 */
function FeaturedNewsCard({ item }: { item: NewsItem }) {
  const domain = extractDomain(item.link)

  return (
    <Card className="transition-all hover:border-primary hover:bg-muted/50 relative overflow-hidden animate-fade-in-up">
      <CardContent className="p-6 sm:p-8">
        <div className="flex flex-col gap-4">
          <div className="flex items-center justify-between">
            <Badge variant="secondary" className="bg-primary/10 text-primary">
              Latest
            </Badge>
            <time className="text-sm text-muted-foreground" dateTime={item.pubDate}>
              {formatRelativeDate(item.pubDate)}
            </time>
          </div>

          <div className="space-y-3">
            <h2 className="text-xl sm:text-2xl font-bold tracking-tight">
              <Link
                href={item.link}
                className="hover:text-primary transition-colors block after:absolute after:inset-0 after:content-[''] z-10"
                target="_blank"
                rel="noopener noreferrer"
              >
                {item.title}
              </Link>
            </h2>
            <p className="text-muted-foreground line-clamp-3">{item.description}</p>
          </div>

          <div className="flex items-center justify-between pt-2">
            <div className="flex items-center gap-2">
              {domain && (
                <>
                  <Image
                    src={getFaviconUrl(item.link)}
                    alt=""
                    width={16}
                    height={16}
                    className="rounded-sm"
                    unoptimized
                  />
                  <span className="text-sm text-muted-foreground">{domain}</span>
                </>
              )}
            </div>
            <span className="text-sm font-medium text-primary flex items-center gap-1 group-hover:gap-2 transition-all">
              Read article
              <ArrowRight className="size-4" />
            </span>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

/**
 * Standard news card component
 */
function NewsCard({ item, index }: { item: NewsItem; index: number }) {
  const domain = extractDomain(item.link)

  return (
    <Card
      className="transition-all hover:border-primary hover:bg-muted/50 relative overflow-hidden animate-fade-in-up group"
      style={{ animationDelay: `${(index + 1) * 50}ms` }}
    >
      <CardContent className="p-4 sm:p-5">
        <div className="flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-muted-foreground/50 tabular-nums">
              {String(index + 2).padStart(2, '0')}
            </span>
            <time className="text-xs text-muted-foreground" dateTime={item.pubDate}>
              {formatDate(item.pubDate)}
            </time>
          </div>

          <h3 className="font-semibold text-sm sm:text-base line-clamp-2">
            <Link
              href={item.link}
              className="hover:text-primary transition-colors block after:absolute after:inset-0 after:content-[''] z-10"
              target="_blank"
              rel="noopener noreferrer"
            >
              {item.title}
              <ExternalLink className="inline-block ml-1.5 size-3.5 opacity-50" />
            </Link>
          </h3>

          <p className="text-xs sm:text-sm text-muted-foreground line-clamp-2">
            {item.description}
          </p>

          {domain && (
            <div className="flex items-center gap-1.5 pt-1">
              <Image
                src={getFaviconUrl(item.link)}
                alt=""
                width={14}
                height={14}
                className="rounded-sm opacity-70"
                unoptimized
              />
              <span className="text-xs text-muted-foreground">{domain}</span>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  )
}

/** Empty state component when no news items are available */
function EmptyState() {
  return (
    <Card className="p-12">
      <div className="flex flex-col items-center justify-center text-center space-y-4">
        <div className="size-16 rounded-full bg-muted flex items-center justify-center">
          <Newspaper className="size-8 text-muted-foreground" />
        </div>
        <div className="space-y-2">
          <h3 className="font-semibold text-lg">No news yet</h3>
          <p className="text-muted-foreground max-w-sm">
            There are no news items available at the moment. Check back later for updates.
          </p>
        </div>
      </div>
    </Card>
  )
}

export default async function NewsPage() {
  let items: NewsItem[] = []

  try {
    const result = await getNewsItems()
    items = result.items
  } catch (error) {
    logger.error('Error loading news page:', { data: error, tags: { type: 'page' } })
  }

  const featuredItem = items[0]
  const remainingItems = items.slice(1)

  return (
    <div className="container mx-auto py-8">
      <div className="space-y-12">
        <Breadcrumb items={[{ name: 'News', href: '/news' }]} baseUrl={getBaseUrl()} />

        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
          <div className="space-y-2">
            <h1 className="text-4xl font-bold tracking-tight flex items-center gap-3">
              <span className="size-2 bg-primary rounded-full" />
              Latest News
            </h1>
            <p className="text-lg text-muted-foreground">
              Stay updated with the latest news and updates from the llms.txt community.
            </p>
          </div>

          <Link href={RSS_FEED_URL} target="_blank" rel="noopener noreferrer">
            <Button variant="outline" className="rounded-none h-9 font-bold">
              <Rss className="mr-2 size-4" />
              RSS Feed
            </Button>
          </Link>
        </div>

        {/* Content */}
        {items.length === 0 ? (
          <EmptyState />
        ) : (
          <div className="space-y-8">
            {/* Featured Article */}
            {featuredItem && <FeaturedNewsCard item={featuredItem} />}

            {/* Remaining Articles Grid */}
            {remainingItems.length > 0 && (
              <section className="space-y-6">
                <h2 className="text-sm font-bold uppercase tracking-wider text-muted-foreground">
                  More Articles
                </h2>
                <div className="grid gap-4 sm:gap-6 sm:grid-cols-2 lg:grid-cols-3">
                  {remainingItems.map((item, index) => (
                    <NewsCard key={`${item.link}-${item.pubDate}`} item={item} index={index} />
                  ))}
                </div>
              </section>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
