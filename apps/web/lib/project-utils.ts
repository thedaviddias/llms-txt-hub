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

export function getFeaturedProjects(projects: WebsiteMetadata[]): WebsiteMetadata[] {
  // Filter for primary category tools only
  const primaryCategoryProjects = projects.filter(project =>
    PRIMARY_CATEGORIES.includes(project.category)
  )

  // Show 8 random tools from primary categories
  return getRandomItems(primaryCategoryProjects, Math.min(8, primaryCategoryProjects.length))
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
