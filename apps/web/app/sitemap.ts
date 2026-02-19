import { readdirSync, statSync } from 'node:fs'
import { join } from 'node:path'
import { logger } from '@thedaviddias/logging'
import type { MetadataRoute } from 'next'
import { categories } from '@/lib/categories'
import { getWebsites } from '@/lib/content-loader'

/**
 * Map of content paths that should be overridden to different URLs
 */
const URL_OVERRIDES: Record<string, string> = {
  'legal/privacy': 'privacy',
  'legal/terms': 'terms',
  'legal/cookies': 'cookies'
}

/**
 * Static routes that should be included in the sitemap
 * Excludes: 'news' (redirects to /), 'submit' (noindex)
 */
const STATIC_ROUTES = ['faq', 'projects', 'websites', 'guides', 'about', 'members']

/**
 * Stable build date used for static route lastModified instead of calling new Date() per entry
 */
const BUILD_DATE = new Date()

/**
 * Recursively get all MDX pages from a directory
 *
 * @param dir - Directory to scan
 * @param baseDir - Base directory for URL path construction
 * @returns Array of page paths
 */
function getContentPages(dir: string, baseDir = ''): string[] {
  const pages: string[] = []

  try {
    const items = readdirSync(dir)

    for (const item of items) {
      const fullPath = join(dir, item)
      const stat = statSync(fullPath)

      if (stat.isDirectory()) {
        // Skip hidden directories, _meta files, and websites/ (handled separately via getWebsites)
        if (!item.startsWith('_') && !item.startsWith('.') && item !== 'websites') {
          pages.push(...getContentPages(fullPath, join(baseDir, item)))
        }
      } else if (item.endsWith('.mdx') && !item.startsWith('_')) {
        // Remove .mdx extension and index becomes empty string
        let pagePath = item === 'index.mdx' ? baseDir : join(baseDir, item.replace('.mdx', ''))

        // Check if this path should be overridden
        pagePath = URL_OVERRIDES[pagePath] || pagePath

        pages.push(pagePath)
      }
    }
  } catch (error) {
    logger.error(`Error reading directory ${dir}:`, { data: error, tags: { type: 'page' } })
  }

  return pages
}

/**
 * Get priority for a page based on its path
 *
 * @param path - Page path
 * @returns Priority value between 0 and 1
 */
function getPriority(path: string): number {
  if (!path) return 1 // Homepage

  // Category pages get high priority based on their type
  const category = categories.find(c => c.slug === path)
  if (category) {
    if (category.priority === 'high') return 0.9
    if (category.priority === 'medium') return 0.8
    return 0.7 // low priority categories
  }

  if (path.startsWith('guides/')) return 0.8
  if (path.startsWith('resources/')) return 0.7
  if (STATIC_ROUTES.includes(path)) return 0.9 // High priority for main static routes
  return 0.5 // Other pages
}

/**
 * Generate sitemap entries for static routes
 *
 * @param baseUrl - Base URL of the website
 * @returns Array of sitemap entries for static routes
 */
function getStaticRoutes(baseUrl: string): MetadataRoute.Sitemap {
  return STATIC_ROUTES.map(route => ({
    url: `${baseUrl}/${route}`,
    lastModified: BUILD_DATE,
    changeFrequency: 'weekly',
    priority: getPriority(route)
  }))
}

export default function sitemap(): MetadataRoute.Sitemap {
  const routes: MetadataRoute.Sitemap = []
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://llmstxthub.com'
  const contentDir = join(process.cwd(), '../../packages/content/data')

  try {
    // Add the root URL first
    routes.push({
      url: baseUrl,
      lastModified: BUILD_DATE,
      changeFrequency: 'daily',
      priority: 1
    })

    // Add category pages with proper SEO metadata
    categories.forEach(category => {
      routes.push({
        url: `${baseUrl}/${category.slug}`,
        lastModified: BUILD_DATE,
        changeFrequency: category.priority === 'high' ? 'daily' : 'weekly',
        priority: getPriority(category.slug)
      })
    })

    // Add static routes
    routes.push(...getStaticRoutes(baseUrl))

    // Add all website detail pages (the core content)
    const websites = getWebsites()
    for (const website of websites) {
      routes.push({
        url: `${baseUrl}/websites/${website.slug}`,
        lastModified: new Date(website.publishedAt),
        changeFrequency: 'monthly',
        priority: 0.8
      })
    }

    // Add content pages (guides, resources, legal, etc.)
    const pages = getContentPages(contentDir)
    for (const page of pages) {
      // Skip u/ paths (user profiles are disallowed in robots.txt)
      if (page.startsWith('u/')) continue

      routes.push({
        url: `${baseUrl}/${page}`,
        lastModified: BUILD_DATE,
        changeFrequency: 'weekly',
        priority: getPriority(page)
      })
    }
  } catch (error) {
    logger.error('Error generating sitemap:', { data: error, tags: { type: 'page' } })
  }

  return routes
}
