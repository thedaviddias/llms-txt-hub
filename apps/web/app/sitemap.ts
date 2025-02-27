import { readdirSync, statSync } from 'node:fs'
import { join } from 'node:path'
import type { MetadataRoute } from 'next'

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
        const pagePath = item === 'index.mdx' ? baseDir : join(baseDir, item.replace('.mdx', ''))
        pages.push(pagePath)
      }
    }
  } catch (error) {
    console.error(`Error reading directory ${dir}:`, error)
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
  if (path.startsWith('guides/')) return 0.8
  if (path.startsWith('resources/')) return 0.7
  return 0.5 // Other pages
}

export default function sitemap(): MetadataRoute.Sitemap {
  const routes: MetadataRoute.Sitemap = []
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://llms-txt-hub.vercel.app'
  const contentDir = join(process.cwd(), '../../content')

  try {
    const pages = getContentPages(contentDir)

    // Add content pages
    pages.forEach(page => {
      routes.push({
        url: `${baseUrl}/${page}`,
        lastModified: new Date(),
        changeFrequency: 'weekly',
        priority: getPriority(page)
      })
    })

    // Add the root URL
    routes.push({
      url: baseUrl,
      lastModified: new Date(),
      changeFrequency: 'daily',
      priority: 1
    })
  } catch (error) {
    console.error('Error generating sitemap:', error)
  }

  return routes
}
