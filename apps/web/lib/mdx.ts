import fs from 'node:fs'
import path from 'node:path'
import matter from 'gray-matter'
import { resolveFromRoot } from './utils'

const websitesDirectory = resolveFromRoot('content/websites')
const guidesDirectory = resolveFromRoot('content/guides')

export interface WebsiteMetadata {
  slug: string
  name: string
  description: string
  website: string
  llmsUrl: string
  llmsFullUrl?: string
  category: string
  publishedAt: string
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
  if (!fs.existsSync(websitesDirectory)) {
    console.error('Websites directory does not exist:', websitesDirectory)
    return []
  }

  const fileNames = fs.readdirSync(websitesDirectory)

  if (fileNames.length === 0) {
    console.warn('No website files found in directory')
    return []
  }

  const websites = fileNames
    .filter((fileName: string) => fileName.endsWith('.mdx'))
    .map((fileName: string) => {
      const slug = fileName.replace(/\.mdx$/, '')
      const fullPath = path.join(websitesDirectory, fileName)
      const fileContents = fs.readFileSync(fullPath, 'utf8')
      const { data } = matter(fileContents)

      return {
        slug,
        ...data
      } as WebsiteMetadata
    })

  return websites
}

export async function getAllGuides(): Promise<GuideMetadata[]> {
  if (!fs.existsSync(guidesDirectory)) {
    console.error('Guides directory does not exist:', guidesDirectory)
    return []
  }

  const fileNames = fs.readdirSync(guidesDirectory)

  if (fileNames.length === 0) {
    console.warn('No guide files found in directory')
    return []
  }

  const guides = fileNames
    .filter((fileName: string) => fileName.endsWith('.mdx'))
    .map((fileName: string) => {
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
    })
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())

  return guides
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
  const fullPath = path.join(websitesDirectory, `${slug}.mdx`)

  if (!fs.existsSync(fullPath)) {
    return null
  }

  const fileContents = fs.readFileSync(fullPath, 'utf8')
  const { data, content } = matter(fileContents)

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
    nextWebsite
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
      console.error('Guide file does not exist:', fullPath)
      return null
    }

    const fileContents = fs.readFileSync(fullPath, 'utf8')
    const { data, content } = matter(fileContents)

    // Calculate reading time
    const words = content.trim().split(/\s+/).length
    const readingTime = Math.ceil(words / 200)

    // Map the date to publishedAt if not provided
    const publishedAt = data.publishedAt || data.date

    return {
      ...data,
      slug,
      content,
      readingTime,
      publishedAt,
      published: data.published ?? true // Default to true if not specified
    } as GuideMetadata & { content: string }
  } catch (error) {
    console.error('Error getting guide by slug:', error)
    return null
  }
}
