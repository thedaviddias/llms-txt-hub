import { execSync } from 'node:child_process'
import path from 'node:path'
import { type BlogPost, getAllBlogPosts } from '@/lib/blog'
import { type WebsiteMetadata, getAllWebsites } from '@/lib/mdx'
import { type Resource, getAllResources } from '@/lib/resources'
import { getRoute, routes } from '@/lib/routes'
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

/**
 * Represents a feed item in the RSS feed
 */
interface FeedItem {
  title: string
  slug: string
  description: string
  date: string
  type: 'blog' | 'website' | 'resource'
  url: string
  categories?: string[]
}

/**
 * Retrieves and combines all content (blog posts, websites, resources) for the RSS feed
 *
 * @returns Promise<FeedItem[]> Array of feed items sorted by date
 */
async function getAllContent(): Promise<FeedItem[]> {
  const [posts, websites, resourcesData] = await Promise.all([
    getAllBlogPosts(),
    getAllWebsites(),
    getAllResources()
  ])

  const feedItems: FeedItem[] = [
    ...posts.map((post: BlogPost) => ({
      title: post.title,
      slug: post.slug,
      description: post.excerpt || '',
      date: post.date,
      type: 'blog' as const,
      url: `${routes.blog}/${post.slug}`,
      categories: ['Blog', ...(post.category ? [post.category] : [])]
    })),
    ...websites.map((site: WebsiteMetadata) => ({
      title: site.name,
      slug: site.slug,
      description: site.description,
      date: getGitLastModified(site.slug),
      type: 'website' as const,
      url: getRoute('website.detail', { slug: site.slug }),
      categories: ['Website', site.category || 'Uncategorized']
    })),
    ...resourcesData.articles.map((resource: Resource) => ({
      title: resource.title,
      slug: resource.slug,
      description: resource.description,
      date: resource.date,
      type: 'resource' as const,
      url: `${routes.resources.articles}/${resource.slug}`,
      categories: ['Resource', resource.type]
    }))
  ]

  // Sort by date, most recent first
  return feedItems.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
}

/**
 * Generates and returns an RSS feed of all content
 *
 * @returns Response RSS feed as XML with appropriate headers
 */
export async function GET() {
  const items = await getAllContent()

  const rss = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0"
     xmlns:atom="http://www.w3.org/2005/Atom"
     xmlns:content="http://purl.org/rss/1.0/modules/content/">
  <channel>
    <title>llms.txt hub</title>
    <link>${baseUrl}</link>
    <description>Discover AI-Ready Documentation and explore websites implementing the llms.txt standard</description>
    <language>en</language>
    <lastBuildDate>${new Date().toUTCString()}</lastBuildDate>
    <atom:link href="${baseUrl}/rss.xml" rel="self" type="application/rss+xml"/>
    ${items
      .map(
        item => `
    <item>
      <title>${item.title}</title>
      <link>${baseUrl}${item.url}</link>
      <guid>${baseUrl}${item.url}</guid>
      <description>${item.description}</description>
      <pubDate>${new Date(item.date).toUTCString()}</pubDate>
      ${item.categories?.map(category => `<category>${category}</category>`).join('')}
      <content:encoded><![CDATA[
        <p>${item.description}</p>
        ${
          item.type === 'website'
            ? `
          <p>This website implements the llms.txt standard for AI-ready documentation.</p>
          <p><a href="${baseUrl}${item.url}">View website details</a></p>
        `
            : ''
        }
        ${
          item.type === 'resource'
            ? `
          <p>Learn more about AI documentation and llms.txt implementation.</p>
          <p><a href="${baseUrl}${item.url}">Access resource</a></p>
        `
            : ''
        }
        ${
          item.type === 'blog'
            ? `
          <p>Read the latest updates and insights about AI documentation.</p>
          <p><a href="${baseUrl}${item.url}">Read full post</a></p>
        `
            : ''
        }
      ]]></content:encoded>
    </item>`
      )
      .join('')}
  </channel>
</rss>`

  return new Response(rss, {
    headers: {
      'Content-Type': 'application/xml',
      'Cache-Control': 'public, s-maxage=1200, stale-while-revalidate=600'
    }
  })
}
