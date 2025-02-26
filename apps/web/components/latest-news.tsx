'use client'

import { RSS_FEED_URL } from '@/app/api/rss-feed/route'
import { getRoute } from '@/lib/routes'
import { Card } from '@thedaviddias/design-system/card'
import { Skeleton } from '@thedaviddias/design-system/skeleton'
import { ArrowRight, ExternalLink, Rss } from 'lucide-react'
import Link from 'next/link'
import { useEffect, useState } from 'react'

interface NewsItem {
  title: string
  link: string
  pubDate: string
}

const NUMBER_OF_NEWS_ITEMS = 5

export function LatestNews() {
  const [news, setNews] = useState<NewsItem[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    async function fetchNews() {
      try {
        setIsLoading(true)
        const response = await fetch('/api/rss-feed')
        if (!response.ok) {
          throw new Error('Failed to fetch news')
        }
        const data = await response.json()
        setNews(data.items.slice(0, NUMBER_OF_NEWS_ITEMS))
      } catch (error) {
        console.error('Failed to fetch news:', error)
        setError('Failed to load latest news. Please try again later.')
      } finally {
        setIsLoading(false)
      }
    }

    fetchNews()
  }, [])

  if (isLoading) {
    return (
      <section className="space-y-4">
        <div className="flex justify-between items-center">
          <div className="flex items-center gap-2">
            <h2 className="text-2xl font-bold">Latest News</h2>
            <Link
              href={RSS_FEED_URL}
              className="text-sm text-muted-foreground hover:text-foreground"
            >
              <Rss className="h-4 w-4" />
              <span className="sr-only">RSS Feed for latest news</span>
            </Link>
          </div>
          <div className="flex items-center gap-2">
            <Link href={getRoute('news')} className="flex items-center">
              View all <ArrowRight className="ml-2 h-4 w-4" />
            </Link>
          </div>
        </div>
        <div className="grid gap-4">
          {Array.from({ length: NUMBER_OF_NEWS_ITEMS }).map((_, index) => (
            <Card key={index} className="p-4">
              <Skeleton className="h-4 w-3/4 mb-2" />
              <Skeleton className="h-4 w-1/2" />
            </Card>
          ))}
        </div>
      </section>
    )
  }

  if (error) {
    return <div className="text-red-500">{error}</div>
  }

  return (
    <section className="space-y-4">
      <div className="flex justify-between items-center">
        <div className="flex items-center gap-2">
          <h2 className="text-2xl font-bold">Latest News</h2>
          <Link href={RSS_FEED_URL} className="text-sm text-muted-foreground hover:text-foreground">
            <Rss className="h-4 w-4" />
            <span className="sr-only">RSS Feed for latest news</span>
          </Link>
        </div>
        <div className="flex items-center gap-2">
          <Link href={getRoute('news')} className="flex items-center">
            View all <ArrowRight className="ml-2 h-4 w-4" />
          </Link>
        </div>
      </div>
      <div className="grid gap-4">
        {isLoading ? (
          Array.from({ length: NUMBER_OF_NEWS_ITEMS }).map((_, index) => (
            <Card key={index} className="p-4">
              <Skeleton className="h-4 w-3/4 mb-2" />
              <Skeleton className="h-4 w-1/2" />
            </Card>
          ))
        ) : news.length > 0 ? (
          news.map((item, index) => (
            <Card key={index} className="p-4">
              <h3 className="font-semibold">
                <Link
                  href={item.link}
                  className="hover:underline"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  {item.title}
                  <ExternalLink className="inline-block ml-2 h-4 w-4" />
                </Link>
              </h3>
              <p className="text-sm text-muted-foreground">
                {new Date(item.pubDate).toLocaleDateString()}
              </p>
            </Card>
          ))
        ) : (
          <p className="text-muted-foreground">No news items available at the moment.</p>
        )}
      </div>
    </section>
  )
}
