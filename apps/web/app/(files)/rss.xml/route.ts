import { execSync } from 'node:child_process'
import path from 'node:path'
import { type WebsiteMetadata, getAllWebsites } from '@/lib/mdx'
import { resolveFromRoot } from '@/lib/utils'

const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://llmstxthub.com'

function getGitLastModified(slug: string): string {
  try {
    const filePath = path.join(resolveFromRoot('content/websites'), `${slug}.mdx`)
    const gitDate = execSync(`git log -1 --format=%cd --date=iso ${filePath}`, {
      encoding: 'utf-8'
    }).trim()
    return gitDate
  } catch (error) {
    console.error('Error getting git history:', error)
    return new Date().toISOString() // Fallback to current date
  }
}

export async function GET() {
  const websitesData = await getAllWebsites()

  const feed = {
    version: 'https://jsonfeed.org/version/1',
    title: 'llms.txt Hub',
    home_page_url: baseUrl,
    feed_url: `${baseUrl}/feed.json`,
    description: 'Latest updates from llms.txt Hub',
    icon: `${baseUrl}/apple-touch-icon.png`,
    favicon: `${baseUrl}/favicon.ico`,
    authors: [
      {
        name: 'David Dias',
        url: 'https://thedaviddias.com'
      }
    ],
    language: 'en',
    items: [
      ...websitesData.map((site: WebsiteMetadata) => ({
        id: site.slug,
        url: `${baseUrl}/websites/${site.slug}`,
        title: site.name,
        content_html: site.description,
        date_published: getGitLastModified(site.slug),
        date_modified: getGitLastModified(site.slug),
        authors: [
          {
            name: 'David Dias',
            url: 'https://thedaviddias.com'
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
