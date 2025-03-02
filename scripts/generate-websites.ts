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
 *
 * This function reads all MDX files from the content/websites directory,
 * extracts their frontmatter, and generates a JSON file with website information
 * including favicons.
 *
 * @throws Will throw an error if the file system operations fail
 *
 * @example
 * ```ts
 * generateWebsitesJson()
 * ```
 */
function generateWebsitesJson(): void {
  const websitesDir = join(process.cwd(), 'content', 'websites')
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

  const websites: Website[] = mdxFiles.map(file => {
    const filePath = join(websitesDir, file)
    const fileContent = readFileSync(filePath, 'utf-8')
    const { data } = matter(fileContent)

    return {
      name: data.name,
      domain: data.website,
      description: data.description,
      llmsTxtUrl: data.llmsUrl,
      ...(data.llmsFullUrl && { llmsFullTxtUrl: data.llmsFullUrl }),
      category: data.category,
      favicon: getFaviconUrl(data.website)
    }
  })

  // Sort websites by name
  websites.sort((a, b) => a.name.localeCompare(b.name))

  // Write to JSON file
  writeFileSync(outputFile, JSON.stringify(websites, null, 2))
}

generateWebsitesJson()
