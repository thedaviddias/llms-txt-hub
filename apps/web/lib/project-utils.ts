import type { WebsiteMetadata } from './content-loader'

/**
 * Filters and returns featured projects, limited to 6 items
 * @param projects - Array of website metadata objects
 * @returns Array of featured projects (max 6)
 */
export function getFeaturedProjects(projects: WebsiteMetadata[]): WebsiteMetadata[] {
  // Get explicitly featured projects only, max 6
  const featuredProjects = projects.filter(project => project.featured === true)
  return featuredProjects.slice(0, 6)
}

/**
 * Returns projects sorted by most recently updated
 * @param projects - Array of website metadata objects
 * @param limit - Maximum number of projects to return (default: 5)
 * @returns Array of recently updated projects
 */
export function getRecentlyUpdatedProjects(
  projects: WebsiteMetadata[],
  limit = 5
): WebsiteMetadata[] {
  return projects
    .sort((a, b) => new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime())
    .slice(0, limit)
}
