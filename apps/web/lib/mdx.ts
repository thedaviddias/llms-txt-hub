import { execSync } from 'node:child_process'
import fs from 'node:fs'
import path from 'node:path'
import matter from 'gray-matter'
import { resolveFromRoot } from './utils'

const websitesDirectory = resolveFromRoot('content/websites')

function getGitLastModified(filePath: string): string {
  try {
    const gitDate = execSync(`git log -1 --format=%cd --date=iso ${filePath}`, {
      encoding: 'utf-8'
    }).trim()
    return gitDate
  } catch (error) {
    console.error('Error getting git history:', error)
    return new Date().toISOString()
  }
}

export interface WebsiteMetadata {
  slug: string
  name: string
  description: string
  website: string
  llmsUrl: string
  llmsFullUrl?: string
  category?: string
  score: number
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
