'use server'

import { getWebsites } from '@/lib/content-loader'
import { getFeaturedProjects, getRecentlyUpdatedProjects } from '@/lib/project-utils'

/**
 * Fetches homepage data including featured projects, recently updated projects, and initial website list
 * Optimized to load only first 50 websites initially to improve performance
 *
 * @returns Promise containing homepage data with pagination info
 */
export async function getHomePageData() {
  const allProjects = await getWebsites()
  const featuredProjects = getFeaturedProjects(allProjects)
  const recentlyUpdatedProjects = getRecentlyUpdatedProjects(allProjects, 6)

  // Only load first 50 projects for initial homepage render to improve performance
  // This reduces initial bundle size and data transfer from ~900 to 50 websites
  const initialProjects = allProjects.slice(0, 50)

  return {
    allProjects: initialProjects,
    featuredProjects,
    recentlyUpdatedProjects,
    totalCount: allProjects.length // For pagination info
  }
}
