import { XMLParser } from 'fast-xml-parser'

/**
 * Interface for RSS feed item
 */
interface RSSFeedItem {
  title: string
  link: string
  pubDate: string
  description: string
}

/**
 * Configuration options for RSS feed fetching
 */
interface RSSFeedOptions {
  /** URL of the RSS feed */
  feedUrl?: string
  /** Number of retry attempts */
  retries?: number
  /** Cache revalidation time in seconds */
  revalidateTime?: number
  /** Custom user agent string */
  userAgent?: string
}

/**
 * Default configuration values
 */
const DEFAULT_OPTIONS: Required<RSSFeedOptions> = {
  feedUrl: process.env.RSS_FEED_URL || 'https://bg.raindrop.io/rss/public/52790163',
  retries: 3,
  revalidateTime: 3600,
  userAgent: 'Mozilla/5.0 (compatible; RSS-Reader/1.0)'
}

/**
 * Fetches data from a URL with retry mechanism
 *
 * @param url - The URL to fetch from
 * @param options - Fetch configuration options
 * @returns Promise resolving to the fetch Response
 * @throws Error if all retry attempts fail
 */
async function fetchWithRetry(
  url: string,
  options: Required<Pick<RSSFeedOptions, 'retries' | 'revalidateTime' | 'userAgent'>>
): Promise<Response> {
  const { retries, revalidateTime, userAgent } = options

  for (let i = 0; i < retries; i++) {
    try {
      const response = await fetch(url, {
        next: { revalidate: revalidateTime },
        headers: {
          'User-Agent': userAgent
        }
      })
      if (response.ok) return response
    } catch (error) {
      if (i === retries - 1) throw error
      await new Promise(resolve => setTimeout(resolve, 1000 * 2 ** i))
    }
  }
  throw new Error('Failed to fetch after retries')
}

/**
 * Fetches and parses an RSS feed
 *
 * @param options - RSS feed configuration options
 * @returns Promise resolving to an array of RSS feed items
 * @throws Error if fetching or parsing fails
 *
 * @example
 * ```typescript
 * const items = await getRSSFeed({
 *   feedUrl: 'https://example.com/feed.xml',
 *   retries: 3
 * });
 * ```
 */
export default async function getRSSFeed(
  options: RSSFeedOptions = {}
): Promise<{ items: RSSFeedItem[] }> {
  const config: Required<RSSFeedOptions> = { ...DEFAULT_OPTIONS, ...options }

  try {
    const response = await fetchWithRetry(config.feedUrl, {
      retries: config.retries,
      revalidateTime: config.revalidateTime,
      userAgent: config.userAgent
    })

    const xmlData = await response.text()
    const parser = new XMLParser()
    const result = parser.parse(xmlData)

    if (!result?.rss?.channel?.item) {
      return { items: [] }
    }

    const items = Array.isArray(result.rss.channel.item)
      ? result.rss.channel.item
      : [result.rss.channel.item]

    const formattedItems: RSSFeedItem[] = items.map((item: any) => ({
      title: item.title || '',
      link: item.link || '',
      pubDate: item.pubDate || '',
      description: item.description || ''
    }))

    return { items: formattedItems }
  } catch (error) {
    console.error('Failed to fetch or parse RSS feed:', error)
    throw new Error('Failed to fetch or parse RSS feed')
  }
}
