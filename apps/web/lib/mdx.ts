import fs from 'node:fs'
import path from 'node:path'
import matter from 'gray-matter'
import { resolveFromRoot } from './utils'

// Define content directories with fallback handling
function safeResolveDirectory(path: string): string {
  try {
    return resolveFromRoot(path)
  } catch (error) {
    console.warn(`Warning: Failed to resolve directory: ${path}`, error)
    return path // Return the path as-is, which will likely fail downstream with a more specific error
  }
}

const websitesDirectory = safeResolveDirectory('content/websites')
const guidesDirectory = safeResolveDirectory('content/guides')
const unofficialDirectory = safeResolveDirectory('content/unofficial')

export interface WebsiteMetadata {
  slug: string
  name: string
  description: string
  website: string
  llmsUrl: string
  llmsFullUrl?: string
  category: string
  publishedAt: string
  isUnofficial?: boolean
}

export interface GuideMetadata {
  slug: string
  title: string
  description: string
  date: string
  authors: Array<{
    name: string
    url?: string
  }>
  tags?: string[]
  readingTime: number
  difficulty: 'beginner' | 'intermediate' | 'advanced'
  category: 'getting-started' | 'implementation' | 'best-practices' | 'integration'
  published: boolean
  publishedAt: string
}

export async function getAllWebsites(): Promise<WebsiteMetadata[]> {
  const websites: WebsiteMetadata[] = []

  // Helper function to process MDX files from a directory
  const processDirectory = (directory: string, isUnofficial = false) => {
    try {
      if (!fs.existsSync(directory)) {
        console.error('Directory does not exist:', directory)
        return []
      }

      const fileNames = fs.readdirSync(directory)

      if (fileNames.length === 0) {
        console.warn('No files found in directory:', directory)
        return []
      }

      return fileNames
        .filter((fileName: string) => fileName.endsWith('.mdx'))
        .map((fileName: string) => {
          try {
            const slug = fileName.replace(/\.mdx$/, '')
            const fullPath = path.join(directory, fileName)
            const fileContents = fs.readFileSync(fullPath, 'utf8')
            const { data } = matter(fileContents)

            return {
              slug,
              name: data.name,
              description: data.description,
              website: data.website,
              llmsUrl: data.llmsUrl,
              llmsFullUrl: data.llmsFullUrl,
              category: data.category,
              publishedAt: data.publishedAt,
              isUnofficial
            } as WebsiteMetadata
          } catch (error) {
            console.error(`Error processing website file ${fileName}:`, error)
            return null
          }
        })
        .filter((website): website is WebsiteMetadata => website !== null)
    } catch (error) {
      console.error(`Error accessing directory ${directory}:`, error)
      return []
    }
  }

  // Process official websites
  try {
    websites.push(...processDirectory(websitesDirectory))

    // Process unofficial websites from subdirectories
    if (fs.existsSync(unofficialDirectory)) {
      try {
        const unofficialDirs = fs
          .readdirSync(unofficialDirectory, { withFileTypes: true })
          .filter(dirent => dirent.isDirectory())
          .map(dirent => path.join(unofficialDirectory, dirent.name))

        for (const dir of unofficialDirs) {
          websites.push(...processDirectory(dir, true))
        }
      } catch (error) {
        console.error('Error processing unofficial directories:', error)
      }
    }
  } catch (error) {
    console.error('Error processing websites:', error)
  }

  return websites
}

export async function getAllGuides(): Promise<GuideMetadata[]> {
  let fileNames: string[] = [];
  
  try {
    if (!fs.existsSync(guidesDirectory)) {
      console.error('Guides directory does not exist:', guidesDirectory)
      return []
    }

    fileNames = fs.readdirSync(guidesDirectory)

    if (fileNames.length === 0) {
      console.warn('No guide files found in directory')
      return []
    }
  } catch (error) {
    console.error('Error accessing guides directory:', error)
    return []
  }

  const guides = fileNames
    .filter((fileName: string) => fileName.endsWith('.mdx'))
    .map((fileName: string) => {
      try {
        const slug = fileName.replace(/\.mdx$/, '')
        const fullPath = path.join(guidesDirectory, fileName)
        const fileContents = fs.readFileSync(fullPath, 'utf8')
        const { data, content } = matter(fileContents)

        // Calculate reading time (assuming average reading speed of 200 words per minute)
        const words = content.trim().split(/\s+/).length
        const readingTime = Math.ceil(words / 200)

        return {
          slug,
          ...data,
          readingTime
        } as GuideMetadata
      } catch (error) {
        console.error(`Error processing guide file ${fileName}:`, error)
        return null
      }
    })
    .filter((guide): guide is GuideMetadata => guide !== null)
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())

  return guides
}

/**
 * Finds the full path to a website's MDX file by searching in both official and unofficial directories
 */
function findWebsiteFile(slug: string): string | null {
  // First check official directory
  const officialPath = path.join(websitesDirectory, `${slug}.mdx`)
  if (fs.existsSync(officialPath)) {
    return officialPath
  }

  // If not found, check unofficial directories
  if (fs.existsSync(unofficialDirectory)) {
    const unofficialDirs = fs
      .readdirSync(unofficialDirectory, { withFileTypes: true })
      .filter(dirent => dirent.isDirectory())
      .map(dirent => path.join(unofficialDirectory, dirent.name))

    for (const dir of unofficialDirs) {
      const unofficialPath = path.join(dir, `${slug}.mdx`)
      if (fs.existsSync(unofficialPath)) {
        return unofficialPath
      }
    }
  }

  return null
}

export async function getWebsiteBySlug(slug: string): Promise<
  | (WebsiteMetadata & {
      content: string
      relatedWebsites: WebsiteMetadata[]
      previousWebsite: WebsiteMetadata | null
      nextWebsite: WebsiteMetadata | null
    })
  | null
> {
  const fullPath = findWebsiteFile(slug)

  if (!fullPath) {
    return null
  }

  const fileContents = fs.readFileSync(fullPath, 'utf8')
  const { data, content } = matter(fileContents)

  // Check if the file is from the unofficial directory
  const isUnofficial = fullPath.includes('/unofficial/')

  // Remove the first heading that matches the website name
  const lines = content.split('\n')
  const filteredLines = lines.filter(line => {
    // Skip any line that is an h1 heading containing the website name
    const isH1WithWebsiteName = line.trim().match(new RegExp(`^#\\s+${data.name}\\s*$`))
    return !isH1WithWebsiteName
  })
  const contentWithoutTitle = filteredLines.join('\n')

  const allWebsites = await getAllWebsites()
  const currentIndex = allWebsites.findIndex(website => website.slug === slug)
  const previousWebsite = currentIndex > 0 ? allWebsites[currentIndex - 1] : null
  const nextWebsite = currentIndex < allWebsites.length - 1 ? allWebsites[currentIndex + 1] : null
  const relatedWebsites = allWebsites
    .filter(website => website.category === data.category && website.slug !== slug)
    .slice(0, 4)

  return {
    ...data,
    slug,
    content: contentWithoutTitle,
    relatedWebsites,
    previousWebsite,
    nextWebsite,
    isUnofficial
  } as WebsiteMetadata & {
    content: string
    relatedWebsites: WebsiteMetadata[]
    previousWebsite: WebsiteMetadata | null
    nextWebsite: WebsiteMetadata | null
  }
}

export async function getGuideBySlug(
  slug: string
): Promise<(GuideMetadata & { content: string }) | null> {
  try {
    const fullPath = path.join(guidesDirectory, `${slug}.mdx`)

    if (!fs.existsSync(fullPath)) {
      return null
    }

    const fileContents = fs.readFileSync(fullPath, 'utf8')
    const { data, content } = matter(fileContents)

    // Map the date to publishedAt if not provided
    const publishedAt = data.date

    return {
      ...data,
      slug,
      content,
      publishedAt
    } as GuideMetadata & { content: string }
  } catch (error) {
    console.error('Error getting guide by slug:', error)
    return null
  }
}
