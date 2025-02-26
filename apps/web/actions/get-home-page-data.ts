'use server'

import { getAllWebsites } from '@/lib/mdx'
import { getFeaturedProjects, getRecentlyUpdatedProjects } from '@/lib/project-utils'

export async function getHomePageData() {
  const allProjects = await getAllWebsites()
  const featuredProjects = getFeaturedProjects(allProjects, 4)
  const recentlyUpdatedProjects = getRecentlyUpdatedProjects(allProjects, 5)

  return {
    allProjects,
    featuredProjects,
    recentlyUpdatedProjects
  }
}
