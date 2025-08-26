import { readFileSync, readdirSync, writeFileSync, mkdirSync } from 'node:fs'
import { join } from 'node:path'
import matter from 'gray-matter'

interface Website {
  name: string
  domain: string
  description: string
  llmsTxtUrl: string
  llmsFullTxtUrl?: string
  category: string
  favicon: string
}

// Primary categories (tools and platforms only)
const PRIMARY_CATEGORIES = [
  'ai-ml',
  'developer-tools',
  'data-analytics',
  'integration-automation',
  'infrastructure-cloud',
  'security-identity'
]

/**
 * Generates a Google Favicon URL for a given domain
 *
 * @param domain - The website domain to get the favicon for
 * @returns The Google Favicon service URL for the domain
 *
 * @example
 * ```ts
 * const favicon = getFaviconUrl('https://example.com')
 * // Returns: https://www.google.com/s2/favicons?domain=example.com&sz=128
 * ```
 */
function getFaviconUrl(domain: string): string {
  // Remove protocol and trailing slashes
  const cleanDomain = domain.replace(/^https?:\/\//, '').replace(/\/$/, '')
  return `https://www.google.com/s2/favicons?domain=${cleanDomain}&sz=128`
}

/**
 * Generates a JSON file containing website information from MDX files
 * Only includes websites from primary tool categories
 *
 * This function reads all MDX files from the packages/content/data/websites directory,
 * extracts their frontmatter, filters for primary categories only, and generates 
 * a JSON file with website information including favicons.
 *
 * @throws Will throw an error if the file system operations fail
 *
 * @example
 * ```ts
 * generateWebsitesJson()
 * ```
 */
function generateWebsitesJson(): void {
  const websitesDir = join(process.cwd(), 'packages', 'content', 'data', 'websites')
  const outputDir = join(process.cwd(), 'data')
  const outputFile = join(outputDir, 'websites.json')

  // Ensure output directory exists
  try {
    mkdirSync(outputDir, { recursive: true })
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== 'EEXIST') {
      throw error
    }
  }

  const mdxFiles = readdirSync(websitesDir).filter(file => file.endsWith('.mdx'))

  const websites: Website[] = mdxFiles
    .map(file => {
      const filePath = join(websitesDir, file)
      const fileContent = readFileSync(filePath, 'utf-8')
      const { data } = matter(fileContent)

      return {
        name: data.name || data.title,
        domain: data.website || data.url,
        description: data.description,
        llmsTxtUrl: data.llmsUrl,
        ...(data.llmsFullUrl && { llmsFullTxtUrl: data.llmsFullUrl }),
        category: data.category?.replace(/'/g, ''), // Remove quotes from category
        favicon: getFaviconUrl(data.website || data.url),
        publishedAt: data.publishedAt
      }
    })
    .filter(website => {
      // Only include websites from primary categories
      return PRIMARY_CATEGORIES.includes(website.category)
    })

  // Sort websites by name
  websites.sort((a, b) => a.name.localeCompare(b.name))

  console.log(`Generated websites.json with ${websites.length} tools from primary categories`)
  console.log(`Excluded ${mdxFiles.length - websites.length} sites from secondary categories`)

  // Write to JSON file
  writeFileSync(outputFile, JSON.stringify(websites))
}

generateWebsitesJson()