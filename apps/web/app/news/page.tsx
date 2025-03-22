import { RSS_FEED_URL } from '@/app/api/rss-feed/route'
import { formatDate } from '@/lib/utils'
import { Breadcrumb } from '@thedaviddias/design-system/breadcrumb'
import { Button } from '@thedaviddias/design-system/button'
import { Card } from '@thedaviddias/design-system/card'
import { getBaseUrl } from '@thedaviddias/utils/get-base-url'
import { XMLParser } from 'fast-xml-parser'
import { ExternalLink, Rss } from 'lucide-react'
import type { Metadata } from 'next'
import Link from 'next/link'

export const metadata: Metadata = {
  title: 'Latest News - llms.txt hub',
  description: 'Stay updated with the latest news and updates from the llms.txt community.'
}

interface NewsItem {
  title: string
  link: string
  pubDate: string
  description: string
}
const isBuildTime = () => process.env.NODE_ENV === 'production'

async function getNewsItems(): Promise<{ items: NewsItem[] }> {
  try {
    // During build time, fetch directly from RSS feed
    if (isBuildTime()) {
      const response = await fetch(RSS_FEED_URL, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (compatible; RSS-Reader/1.0)'
        }
      })

      if (!response.ok) {
        console.error('Failed to fetch RSS feed during build')
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
          description: item.description || ''
        }))
      }
    }

    // During runtime, use the API route
    const baseUrl = getBaseUrl()
    const res = await fetch(`${baseUrl}/api/rss-feed`, {
      next: { revalidate: 172800 }
    })

    if (!res.ok) {
      throw new Error('Failed to fetch news')
    }

    return res.json()
  } catch (error) {
    console.error('Error fetching news:', error)
    return { items: [] }
  }
}

export default async function NewsPage() {
  const { items } = await getNewsItems()

  return (
    <div className="max-w-6xl mx-auto px-4 py-8">
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
