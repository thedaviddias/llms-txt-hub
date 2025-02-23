import { type WebsiteMetadata, getAllWebsites } from './mdx'

export async function calculateProjectScores(): Promise<WebsiteMetadata[]> {
  const websites = await getAllWebsites()
  const now = new Date()

  return websites.map(website => {
    const lastUpdated = new Date(website.lastUpdated)
    const daysSinceUpdate = (now.getTime() - lastUpdated.getTime()) / (1000 * 3600 * 24)

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
  return projects.sort((a, b) => b.score - a.score).slice(0, limit)
}

export function getRecentlyUpdatedProjects(
  projects: WebsiteMetadata[],
  limit = 4
): WebsiteMetadata[] {
  return projects
    .sort((a, b) => new Date(b.lastUpdated).getTime() - new Date(a.lastUpdated).getTime())
    .slice(0, limit)
}
