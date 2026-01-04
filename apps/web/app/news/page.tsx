import { Breadcrumb } from '@thedaviddias/design-system/breadcrumb'
import { Button } from '@thedaviddias/design-system/button'
import { logger } from '@thedaviddias/logging'
import { getBaseUrl } from '@thedaviddias/utils/get-base-url'
import { XMLParser } from 'fast-xml-parser'
import { ExternalLink, Rss } from 'lucide-react'
import type { Metadata } from 'next'
import Link from 'next/link'
import { RSS_FEED_URL } from '@/app/api/rss-feed/route'
import { Card } from '@/components/ui/card'
import { generateBaseMetadata } from '@/lib/seo/seo-config'
import { formatDate } from '@/lib/utils'

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
 * @returns Promise containing an array of news items
 */
async function getNewsItems(): Promise<{ items: NewsItem[] }> {
  try {
    // Always fetch directly from RSS feed on server
    const response = await fetch(RSS_FEED_URL, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; RSS-Reader/1.0)'
      },
      next: { revalidate: 172800 } // Cache for 48 hours
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

export default async function NewsPage() {
  let items: NewsItem[] = []

  try {
    const result = await getNewsItems()
    items = result.items
  } catch (error) {
    logger.error('Error loading news page:', { data: error, tags: { type: 'page' } })
    // Continue with empty items array
  }

  return (
    <div className="container mx-auto py-8">
      <Breadcrumb items={[{ name: 'News', href: '/news' }]} baseUrl={getBaseUrl()} />
      <div className="mx-auto space-y-8">
        <div className="flex justify-between items-center">
          <div className="space-y-4">
            <h1 className="text-4xl font-bold">Latest News</h1>
            <p className="text-lg text-muted-foreground">
              Stay updated with the latest news and updates from the llms.txt community.
            </p>
          </div>

          <Link href={RSS_FEED_URL} className="inline-flex">
            <Button variant="outline">
              <Rss className="mr-2 size-4" />
              RSS Feed
            </Button>
          </Link>
        </div>
        {items.length === 0 ? (
          <Card className="p-6">
            <p className="text-center text-muted-foreground">
              No news items available at the moment.
            </p>
          </Card>
        ) : (
          <div className="grid gap-6">
            {items.map((item: NewsItem) => (
              <Card key={`${item.link}-${item.pubDate}`} className="p-6">
                <article className="space-y-4">
                  <h2 className="text-xl font-semibold">
                    <Link
                      href={item.link}
                      className="hover:underline"
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      {item.title}
                      <ExternalLink className="inline-block ml-2 size-4" />
                    </Link>
                  </h2>
                  <p className="text-muted-foreground">{item.description}</p>
                  <div className="flex justify-between items-center text-sm text-muted-foreground">
                    <time dateTime={item.pubDate}>{formatDate(item.pubDate)}</time>
                    <Link
                      href={item.link}
                      className="hover:underline"
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      Read more
                    </Link>
                  </div>
                </article>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
