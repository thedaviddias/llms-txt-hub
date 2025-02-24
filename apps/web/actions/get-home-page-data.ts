'use server'

import {
  calculateProjectScores,
  getFeaturedProjects,
  getRecentlyUpdatedProjects
} from '@/lib/project-utils'

export async function getHomePageData() {
  const allProjects = await calculateProjectScores()
  const featuredProjects = getFeaturedProjects(allProjects, 4)
  const recentlyUpdatedProjects = getRecentlyUpdatedProjects(allProjects, 5)

  return {
    allProjects,
    featuredProjects,
    recentlyUpdatedProjects
  }
}
