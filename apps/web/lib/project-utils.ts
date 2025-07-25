import type { WebsiteMetadata } from './content-loader'

export function getFeaturedProjects(projects: WebsiteMetadata[], limit = 8): WebsiteMetadata[] {
  // Separate tools/platforms from personal sites
  const toolProjects = projects.filter(
    project =>
      project.contentType === 'tool' ||
      project.contentType === 'platform' ||
      project.contentType === 'library'
  )
  const personalProjects = projects.filter(project => project.contentType === 'personal')

  // Show 4 tools and 4 personal sites
  const toolLimit = Math.min(4, toolProjects.length)
  const personalLimit = Math.min(4, personalProjects.length)

  const selectedTools = getRandomItems(toolProjects, toolLimit)
  const selectedPersonal = getRandomItems(personalProjects, personalLimit)

  // Combine and return
  return [...selectedTools, ...selectedPersonal]
}

export function getRecentlyUpdatedProjects(
  projects: WebsiteMetadata[],
  limit = 5
): WebsiteMetadata[] {
  return projects
    .sort((a, b) => new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime())
    .slice(0, limit)
}

function getRandomItems<T>(array: T[], count: number): T[] {
  const shuffled = [...array].sort(() => 0.5 - Math.random())
  return shuffled.slice(0, count)
}
