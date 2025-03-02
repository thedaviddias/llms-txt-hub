import type { WebsiteMetadata } from './mdx'

export function getFeaturedProjects(projects: WebsiteMetadata[], limit = 4): WebsiteMetadata[] {
  // Create a copy of all projects
  const availableProjects = [...projects]
  const selectedProjects: WebsiteMetadata[] = []

  // Randomly select 'limit' number of projects
  while (selectedProjects.length < limit && availableProjects.length > 0) {
    const randomIndex = Math.floor(Math.random() * availableProjects.length)
    selectedProjects.push(availableProjects[randomIndex])
    availableProjects.splice(randomIndex, 1)
  }

  return selectedProjects
}

export function getRecentlyUpdatedProjects(
  projects: WebsiteMetadata[],
  limit = 4
): WebsiteMetadata[] {
  return projects
    .sort((a, b) => {
      const dateA = new Date(a.publishedAt).getTime()
      const dateB = new Date(b.publishedAt).getTime()
      return dateB - dateA
    })
    .slice(0, limit)
}
