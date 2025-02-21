import { XMLParser } from 'fast-xml-parser'
import { NextResponse } from 'next/server'

const RSS_FEED_URL = 'https://bg.raindrop.io/rss/public/52790163'

// Increase timeout and add retry logic
const FETCH_OPTIONS = {
  next: { revalidate: 3600 }, // Cache for 1 hour
  headers: {
    'User-Agent': 'Mozilla/5.0 (compatible; RSS-Reader/1.0)'
  },
  timeout: 10000 // Increased to 10 seconds
}

// Segment Config
export const dynamic = 'force-dynamic'
export const fetchCache = 'force-no-store'
export const revalidate = 0

async function fetchWithRetry(url: string, options: any, retries = 3): Promise<Response> {
  for (let i = 0; i < retries; i++) {
    try {
      const response = await fetch(url, options)
      if (response.ok) return response
    } catch (error) {
      if (i === retries - 1) throw error
      await new Promise(resolve => setTimeout(resolve, 1000 * (i + 1))) // Exponential backoff
    }
  }
  throw new Error('Failed to fetch after retries')
}

export async function GET() {
  try {
    const response = await fetchWithRetry(RSS_FEED_URL, FETCH_OPTIONS)

    if (!response.ok) {
      console.error(`HTTP Error: ${response.status} ${response.statusText}`)
      throw new Error(`Failed to fetch RSS feed: ${response.status}`)
    }

    const xmlData = await response.text()
    const parser = new XMLParser()
    const result = parser.parse(xmlData)

    if (!result?.rss?.channel?.item) {
      throw new Error('Invalid RSS feed structure')
    }

    const items = Array.isArray(result.rss.channel.item)
      ? result.rss.channel.item
      : [result.rss.channel.item]

    const formattedItems = items.map((item: any) => ({
      title: item.title || '',
      link: item.link || '',
      pubDate: item.pubDate || '',
      description: item.description || ''
    }))

    return NextResponse.json({ items: formattedItems })
  } catch (error) {
    console.error('Failed to fetch or parse RSS feed:', error)
    return NextResponse.json(
      {
        error: 'Failed to fetch or parse RSS feed',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}
