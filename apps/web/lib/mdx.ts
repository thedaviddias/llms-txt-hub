import fs from 'node:fs'
import path from 'node:path'
import matter from 'gray-matter'

const websitesDirectory = path.join(process.cwd(), '../../content', 'websites')

export interface WebsiteMetadata {
  slug: string
  name: string
  description: string
  website: string
  llmsUrl: string
  llmsFullUrl?: string
  category?: string
  lastUpdated: string
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
    .filter(fileName => fileName.endsWith('.mdx'))
    .map(fileName => {
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

export async function getWebsiteBySlug(slug: string) {
  const fullPath = path.join(websitesDirectory, `${slug}.mdx`)

  if (!fs.existsSync(fullPath)) {
    return null
  }

  const fileContents = fs.readFileSync(fullPath, 'utf8')
  const { data, content } = matter(fileContents)

  // Remove the first heading that matches the project name
  const lines = content.split('\n')
  const filteredLines = lines.filter(line => {
    // Skip any line that is an h1 heading containing the project name
    const isH1WithProjectName = line.trim().match(new RegExp(`^#\\s+${data.name}\\s*$`))
    return !isH1WithProjectName
  })
  const contentWithoutTitle = filteredLines.join('\n')

  const allWebsites = await getAllWebsites()
  const currentIndex = allWebsites.findIndex(website => website.slug === slug)
  const previousProject = currentIndex > 0 ? allWebsites[currentIndex - 1] : null
  const nextProject = currentIndex < allWebsites.length - 1 ? allWebsites[currentIndex + 1] : null
  const relatedProjects = allWebsites
    .filter(website => website.category === data.category && website.slug !== slug)
    .slice(0, 4)

  return {
    ...data,
    slug,
    content: contentWithoutTitle,
    relatedProjects,
    previousProject,
    nextProject
  }
}
