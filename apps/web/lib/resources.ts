import fs from 'node:fs'
import path from 'node:path'
import matter from 'gray-matter'
import { resolveFromRoot } from './utils'

const resourcesDirectory = resolveFromRoot('content/resources')

export interface Resource {
  slug: string
  title: string
  description: string
  link: string
  type: string
}

export async function getAllResources(): Promise<Resource[]> {
  if (!fs.existsSync(resourcesDirectory)) {
    console.error('Resources directory does not exist:', resourcesDirectory)
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

      return {
        slug,
        ...data
      } as Resource
    })

  return resources
}

export async function getResourceBySlug(slug: string): Promise<Resource | null> {
  const fullPath = path.join(resourcesDirectory, `${slug}.mdx`)

  if (!fs.existsSync(fullPath)) {
    return null
  }

  const fileContents = fs.readFileSync(fullPath, 'utf8')
  const { data } = matter(fileContents)

  return {
    slug,
    ...data
  } as Resource
}
