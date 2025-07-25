import type { WebsiteMetadata } from './content-loader'

export function getFeaturedProjects(projects: WebsiteMetadata[], limit = 4): WebsiteMetadata[] {
  // Separate tools/platforms from personal sites
  const toolProjects = projects.filter(
    project =>
      project.contentType === 'tool' ||
      project.contentType === 'platform' ||
      project.contentType === 'library'
  )
  const personalProjects = projects.filter(project => project.contentType === 'personal')

  // Prioritize tools - show mostly tools with maybe 1 personal site
  const toolLimit = Math.min(limit - 1, toolProjects.length)
  const personalLimit = Math.min(1, personalProjects.length)

  const selectedTools = getRandomItems(toolProjects, toolLimit)
  const selectedPersonal = getRandomItems(personalProjects, personalLimit)

  return [...selectedTools, ...selectedPersonal]
}

export function getRecentlyUpdatedProjects(
  projects: WebsiteMetadata[],
  limit = 4
): WebsiteMetadata[] {
  // Prioritize tools in recently updated as well
  const toolProjects = projects.filter(
    project =>
      project.contentType === 'tool' ||
      project.contentType === 'platform' ||
      project.contentType === 'library'
  )
  const personalProjects = projects.filter(project => project.contentType === 'personal')

  // Sort both by date
  const sortedTools = toolProjects.sort((a, b) => {
    const dateA = new Date(a.publishedAt).getTime()
    const dateB = new Date(b.publishedAt).getTime()
    return dateB - dateA
  })

  const sortedPersonal = personalProjects.sort((a, b) => {
    const dateA = new Date(a.publishedAt).getTime()
    const dateB = new Date(b.publishedAt).getTime()
    return dateB - dateA
  })

  // Return mostly tools with maybe 1 personal site
  const toolLimit = Math.min(limit - 1, sortedTools.length)
  const personalLimit = Math.min(1, sortedPersonal.length)

  return [...sortedTools.slice(0, toolLimit), ...sortedPersonal.slice(0, personalLimit)]
}

/**
 * Helper function to get random items from an array
 */
function getRandomItems<T>(array: T[], count: number): T[] {
  const shuffled = [...array].sort(() => 0.5 - Math.random())
  return shuffled.slice(0, count)
}
