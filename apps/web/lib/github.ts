import { Octokit } from '@octokit/rest'
import { logger } from '@thedaviddias/logging'

const octokit = process.env.GITHUB_TOKEN
  ? new Octokit({
      auth: process.env.GITHUB_TOKEN
    })
  : new Octokit() // Will work with rate-limited public access

export interface GitHubProject {
  name: string
  fullName: string
  description: string
  url: string
  stars: number
  lastUpdated: string
}

/**
 * Fetches GitHub repositories matching a specific topic tag
 * @param tag - The GitHub topic to search for
 * @returns Promise resolving to array of GitHubProject objects
 */
export async function fetchGitHubProjects(tag: string): Promise<GitHubProject[]> {
  if (!process.env.GITHUB_TOKEN) {
    logger.warn('GITHUB_TOKEN not set - GitHub API requests will be rate-limited')
  }

  try {
    const response = await octokit.search.repos({
      q: `topic:${tag}`,
      sort: 'stars',
      order: 'desc',
      per_page: 10
    })

    return response.data.items
      .filter(
        (item): item is typeof item & { owner: NonNullable<typeof item.owner> } =>
          item.owner !== null
      )
      .map(item => ({
        name: item.name,
        fullName: item.full_name,
        description: item.description || '',
        url: item.html_url,
        stars: item.stargazers_count,
        lastUpdated: item.updated_at
      }))
  } catch (error) {
    logger.error('Error fetching GitHub projects:', { data: error, tags: { type: 'library' } })
    return []
  }
}
