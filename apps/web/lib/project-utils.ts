import type { WebsiteMetadata } from './content-loader'

// Primary categories (tools and platforms only)
const PRIMARY_CATEGORIES = [
  'ai-ml',
  'developer-tools',
  'data-analytics',
  'integration-automation',
  'infrastructure-cloud',
  'security-identity'
]

export function getFeaturedProjects(projects: WebsiteMetadata[], limit = 8): WebsiteMetadata[] {
  // Filter for primary category tools and personal sites separately
  const primaryCategoryProjects = projects.filter(project =>
    PRIMARY_CATEGORIES.includes(project.category)
  )
  const personalProjects = projects.filter(project => project.contentType === 'personal')

  // Show 4 tools from primary categories and 4 personal sites
  const toolLimit = Math.min(4, primaryCategoryProjects.length)
  const personalLimit = Math.min(4, personalProjects.length)

  const selectedTools = getRandomItems(primaryCategoryProjects, toolLimit)
  const selectedPersonal = getRandomItems(personalProjects, personalLimit)

  // Combine and return both for the component to handle separately
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
