import fs from 'node:fs'
import path from 'node:path'
import { logger } from '@thedaviddias/logging'
import matter from 'gray-matter'

// Inline server-only function to avoid import issues
function resolveFromRoot(...paths: string[]): string {
  return path.resolve(process.cwd(), ...paths)
}

const resourcesDirectory = resolveFromRoot('content/resources')

export interface Resource {
  slug: string
  title: string
  description: string
  link: string
  type: string
}

/**
 * Type guard to validate resource data
 *
 * @param data - The data to validate
 * @returns True if the data is a valid resource
 */
function isValidResourceData(data: any): data is Omit<Resource, 'slug'> {
  return (
    typeof data === 'object' &&
    data !== null &&
    typeof data.title === 'string' &&
    typeof data.description === 'string' &&
    typeof data.link === 'string' &&
    typeof data.type === 'string'
  )
}

/**
 * Get all resources from the resources directory
 */
export async function getAllResources(): Promise<Resource[]> {
  if (!fs.existsSync(resourcesDirectory)) {
    logger.error('Resources directory does not exist:', {
      data: resourcesDirectory,
      tags: { type: 'library' }
    })
    return []
  }

  const fileNames = fs.readdirSync(resourcesDirectory)

  if (fileNames.length === 0) {
    console.warn('No resource files found in directory')
    return []
  }

  const resources = fileNames
    .filter((fileName: string) => fileName.endsWith('.mdx'))
    .map((fileName: string) => {
      const slug = fileName.replace(/\.mdx$/, '')
      const fullPath = path.join(resourcesDirectory, fileName)
      const fileContents = fs.readFileSync(fullPath, 'utf8')
      const { data } = matter(fileContents)

      if (!isValidResourceData(data)) {
        logger.warn('Invalid resource data found:', {
          data: { slug, frontmatter: data },
          tags: { type: 'library' }
        })
        return null
      }

      return {
        slug,
        ...data
      }
    })
    .filter((resource): resource is Resource => resource !== null)

  return resources
}

/**
 * Get a specific resource by slug
 */
export async function getResourceBySlug(slug: string): Promise<Resource | null> {
  const fullPath = path.join(resourcesDirectory, `${slug}.mdx`)

  if (!fs.existsSync(fullPath)) {
    return null
  }

  const fileContents = fs.readFileSync(fullPath, 'utf8')
  const { data } = matter(fileContents)

  if (!isValidResourceData(data)) {
    logger.warn('Invalid resource data found for slug:', {
      data: { slug, frontmatter: data },
      tags: { type: 'library' }
    })
    return null
  }

  return {
    slug,
    ...data
  }
}
