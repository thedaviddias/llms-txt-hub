import { readFile, readdir } from 'node:fs/promises'
import { join } from 'node:path'
import matter from 'gray-matter'
import { cache } from 'react'

export interface Resource {
  slug: string
  title: string
  description: string
  url: string
  date: string
  type: 'Article' | 'Tutorial' | 'Discussion' | 'Video' | 'Open Source Project'
  source: string
  tags?: string[]
}

/**
 * Retrieves and categorizes all resources from the content directory
 *
 * @returns Promise containing categorized resources
 * @throws Error if unable to read resources
 */
export const getAllResources = cache(
  async (): Promise<{
    articles: Resource[]
    openSourceProjects: Resource[]
  }> => {
    try {
      // Use process.cwd() for build-time path resolution
      const resourcesDirectory = join(process.cwd(), 'content', 'resources')

      let fileNames: string[]
      try {
        fileNames = await readdir(resourcesDirectory)
      } catch (error) {
        return { articles: [], openSourceProjects: [] }
      }

      if (fileNames.length === 0) {
        return { articles: [], openSourceProjects: [] }
      }

      const resources = await Promise.all(
        fileNames
          .filter(fileName => fileName.endsWith('.mdx'))
          .map(async fileName => {
            try {
              const fullPath = join(resourcesDirectory, fileName)
              const fileContents = await readFile(fullPath, 'utf8')
              const { data } = matter(fileContents)

              // Validate required fields
              const requiredFields = ['title', 'description', 'url', 'date', 'type', 'source']
              const missingFields = requiredFields.filter(field => !data[field])

              if (missingFields.length > 0) {
                console.warn(
                  `Skipping ${fileName}: Missing required fields: ${missingFields.join(', ')}`
                )
                return null
              }

              return {
                slug: fileName.replace(/\.mdx$/, ''),
                ...data
              } as Resource
            } catch (error) {
              console.error(`Error processing resource ${fileName}:`, error)
              return null
            }
          })
      )

      const validResources = resources
        .filter((resource): resource is Resource => resource !== null)
        .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())

      // Categorize resources
      const articles = validResources.filter(resource => resource.type !== 'Open Source Project')
      const openSourceProjects = validResources.filter(
        resource => resource.type === 'Open Source Project'
      )

      return { articles, openSourceProjects }
    } catch (error) {
      console.error('Failed to get resources:', error)
      return { articles: [], openSourceProjects: [] }
    }
  }
)

/**
 * Get a single resource by slug
 */
export async function getResource(slug: string): Promise<Resource | null> {
  try {
    const { articles, openSourceProjects } = await getAllResources()
    return [...articles, ...openSourceProjects].find(resource => resource.slug === slug) ?? null
  } catch {
    return null
  }
}
