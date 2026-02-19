import { getWebsites, type WebsiteMetadata } from '@/lib/content-loader'

const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://llmstxthub.com'

/**
 * Handles GET requests to generate the RSS feed as JSON
 */
export async function GET() {
  const websitesData = await getWebsites()

  const feed = {
    version: 'https://jsonfeed.org/version/1',
    title: 'llms.txt Hub',
    home_page_url: baseUrl,
    feed_url: `${baseUrl}/rss.xml`,
    description: 'Latest updates from llms.txt Hub',
    icon: `${baseUrl}/apple-touch-icon.png`,
    favicon: `${baseUrl}/favicon.ico`,
    authors: [
      {
        name: 'llms.txt Hub',
        url: 'https://llmstxthub.com'
      }
    ],
    language: 'en',
    items: [
      ...websitesData.map((site: WebsiteMetadata) => ({
        id: site.slug,
        url: `${baseUrl}/websites/${site.slug}`,
        title: site.name,
        content_html: site.description,
        date_published: site.publishedAt,
        authors: [
          {
            name: 'llms.txt Hub',
            url: 'https://llmstxthub.com'
          }
        ],
        categories: ['Website', site.category || 'Uncategorized']
      }))
    ]
  }

  return new Response(JSON.stringify(feed), {
    headers: {
      'content-type': 'application/json;charset=UTF-8'
    }
  })
}
