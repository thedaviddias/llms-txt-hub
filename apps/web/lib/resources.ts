import fs from 'node:fs'
import { getContentFilePath, getContentPath } from '@thedaviddias/utils/content-paths'
import matter from 'gray-matter'

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

export async function getAllResources(): Promise<{
  articles: Resource[]
  openSourceProjects: Resource[]
}> {
  const resourcesDirectory = getContentPath('resources')

  // Ensure directory exists
  if (!fs.existsSync(resourcesDirectory)) {
    fs.mkdirSync(resourcesDirectory, { recursive: true })
  }

  const fileNames = fs.readdirSync(resourcesDirectory)
  const resources = fileNames.map((fileName) => {
    const slug = fileName.replace(/\.mdx$/, '')
    const fullPath = getContentFilePath('resources', fileName)
    const fileContents = fs.readFileSync(fullPath, 'utf8')
    const { data } = matter(fileContents)

    return {
      slug,
      ...data,
    } as Resource
  })

  // Sort resources by date
  const sortedResources = resources.sort(
    (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime(),
  )

  // Separate articles and open-source projects
  const articles = sortedResources.filter((resource) => resource.type !== 'Open Source Project')
  const openSourceProjects = sortedResources.filter(
    (resource) => resource.type === 'Open Source Project',
  )

  return { articles, openSourceProjects }
}
