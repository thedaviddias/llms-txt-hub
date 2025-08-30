import { readdirSync, statSync } from 'node:fs'
import { join } from 'node:path'
import { categories } from '@/lib/categories'
import { logger } from '@thedaviddias/logging'
import type { MetadataRoute } from 'next'

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
 */
const STATIC_ROUTES = [
  'faq',
  'projects',
  'websites',
  'news',
  'guides',
  'about',
  'members',
  'submit'
]

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
        // Skip hidden directories and _meta files
        if (!item.startsWith('_') && !item.startsWith('.')) {
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
  if (path.startsWith('u/')) return 0.3 // User profiles get lower priority
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
    lastModified: new Date(),
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
      lastModified: new Date(),
      changeFrequency: 'daily',
      priority: 1
    })

    // Add category pages with proper SEO metadata
    categories.forEach(category => {
      routes.push({
        url: `${baseUrl}/${category.slug}`,
        lastModified: new Date(),
        changeFrequency: category.priority === 'high' ? 'daily' : 'weekly',
        priority: getPriority(category.slug)
      })
    })

    // Add static routes
    routes.push(...getStaticRoutes(baseUrl))

    // Add content pages
    const pages = getContentPages(contentDir)
    pages.forEach(page => {
      routes.push({
        url: `${baseUrl}/${page}`,
        lastModified: new Date(),
        changeFrequency: 'weekly',
        priority: getPriority(page)
      })
    })
  } catch (error) {
    logger.error('Error generating sitemap:', { data: error, tags: { type: 'page' } })
  }

  return routes
}
