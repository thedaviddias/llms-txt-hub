'use server'

import { getWebsites } from '@/lib/content-loader'
import { getFeaturedProjects, getRecentlyUpdatedProjects } from '@/lib/project-utils'

/**
 * Fetches homepage data including featured projects, recently updated projects, and initial website list
 * Optimized to load only first 48 websites initially to improve performance
 *
 * @returns Promise containing homepage data with pagination info
 */
export async function getHomePageData() {
  const allProjects = await getWebsites()
  const featuredProjects = getFeaturedProjects(allProjects)
  const recentlyUpdatedProjects = getRecentlyUpdatedProjects(allProjects, 6)

  // Only load first 48 projects for initial homepage render to improve performance
  // This reduces initial bundle size and data transfer from ~900 to 48 websites
  const initialProjects = allProjects.slice(0, 48)

  return {
    allProjects: initialProjects,
    featuredProjects,
    recentlyUpdatedProjects,
    totalCount: allProjects.length // For pagination info
  }
}
