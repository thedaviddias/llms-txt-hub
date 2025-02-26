import { execSync } from 'node:child_process'
import path from 'node:path'
import { type WebsiteMetadata, getAllWebsites } from './mdx'
import { resolveFromRoot } from './utils'

function getGitLastModified(slug: string): Date {
  try {
    const filePath = path.join(resolveFromRoot('content/websites'), `${slug}.mdx`)
    const gitDate = execSync(`git log -1 --format=%cd --date=iso ${filePath}`, {
      encoding: 'utf-8'
    }).trim()
    return new Date(gitDate)
  } catch (error) {
    console.error('Error getting git history:', error)
    // Use a fixed date as fallback instead of filesystem timestamps
    // This ensures consistent behavior across environments
    return new Date('2020-01-01') // Fixed date in the past
  }
}

export async function calculateProjectScores(): Promise<WebsiteMetadata[]> {
  const websites = await getAllWebsites()
  const now = new Date()

  return websites.map(website => {
    const lastModified = getGitLastModified(website.slug)
    const daysSinceUpdate = (now.getTime() - lastModified.getTime()) / (1000 * 3600 * 24)

    // Calculate score based on various factors
    let score = 0
    score += website.llmsFullUrl ? 50 : 0 // Bonus for having llms-full.txt
    score -= Math.min(daysSinceUpdate * 2, 100) // Penalize older entries, max 100 points

    return {
      ...website,
      score: Math.max(score, 0) // Ensure score is not negative
    }
  })
}

export function getFeaturedProjects(projects: WebsiteMetadata[], limit = 4): WebsiteMetadata[] {
  // Create a copy of all projects
  const availableProjects = [...projects]
  const selectedProjects: WebsiteMetadata[] = []

  // Randomly select 'limit' number of projects
  while (selectedProjects.length < limit && availableProjects.length > 0) {
    const randomIndex = Math.floor(Math.random() * availableProjects.length)
    selectedProjects.push(availableProjects[randomIndex])
    availableProjects.splice(randomIndex, 1)
  }

  return selectedProjects
}

export function getRecentlyUpdatedProjects(
  projects: WebsiteMetadata[],
  limit = 4
): WebsiteMetadata[] {
  return projects
    .map(project => ({
      ...project,
      lastModified: getGitLastModified(project.slug)
    }))
    .sort((a, b) => b.lastModified.getTime() - a.lastModified.getTime())
    .slice(0, limit)
    .map(({ lastModified, ...project }) => project)
}
