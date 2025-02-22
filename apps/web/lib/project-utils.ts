import { getAllWebsites } from './mdx'

export interface ProjectMetadata {
  name: string
  description: string
  website: string
  llmsUrl: string
  llmsFullUrl?: string
  lastUpdated: string
  score: number
  favorites: number
}

export async function calculateProjectScores(): Promise<ProjectMetadata[]> {
  const websites = await getAllWebsites()
  const now = new Date()

  return websites.map(website => {
    const lastUpdated = new Date(website.lastUpdated)
    const daysSinceUpdate = (now.getTime() - lastUpdated.getTime()) / (1000 * 3600 * 24)

    // Calculate score based on various factors
    let score = 0
    score += website.favorites * 10 // Each favorite is worth 10 points
    score += website.llmsFullUrl ? 50 : 0 // Bonus for having llms-full.txt
    score -= Math.min(daysSinceUpdate * 2, 100) // Penalize older entries, max 100 points

    return {
      ...website,
      score: Math.max(score, 0) // Ensure score is not negative
    }
  })
}

export function getFeaturedProjects(projects: ProjectMetadata[], limit = 4): ProjectMetadata[] {
  return projects.sort((a, b) => b.score - a.score).slice(0, limit)
}

export function getRecentlyUpdatedProjects(
  projects: ProjectMetadata[],
  limit = 4
): ProjectMetadata[] {
  return projects
    .sort((a, b) => new Date(b.lastUpdated).getTime() - new Date(a.lastUpdated).getTime())
    .slice(0, limit)
}

export function getCommunityFavorites(projects: ProjectMetadata[], limit = 4): ProjectMetadata[] {
  return projects.sort((a, b) => b.favorites - a.favorites).slice(0, limit)
}
