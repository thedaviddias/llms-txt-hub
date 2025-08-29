'use server'

import { getWebsites } from '@/lib/content-loader'
import { getFeaturedProjects, getRecentlyUpdatedProjects } from '@/lib/project-utils'

export async function getHomePageData() {
  const allProjects = await getWebsites()
  const featuredProjects = getFeaturedProjects(allProjects)
  const recentlyUpdatedProjects = getRecentlyUpdatedProjects(allProjects, 6)

  return {
    allProjects,
    featuredProjects,
    recentlyUpdatedProjects
  }
}
