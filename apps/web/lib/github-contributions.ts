import { logger } from '@thedaviddias/logging'
import { GitHubAPIClient } from '@/lib/github-security-utils'
import { hashSensitiveData } from '@/lib/server-crypto'

export interface GitHubContribution {
  type: 'pull_request' | 'issue' | 'commit'
  title: string
  url: string
  created_at: string
  state?: string
  merged?: boolean
}

export interface ContributionSummary {
  total: number
  pullRequests: number
  issues: number
  commits: number
  contributions: GitHubContribution[]
}

const REPO_OWNER = 'thedaviddias'
const REPO_NAME = 'llms-txt-hub'

/**
 * Get GitHub contributions for a specific user
 *
 * @param username - GitHub username to check
 * @returns Promise resolving to contribution summary
 */
export async function getUserContributions(username: string): Promise<ContributionSummary> {
  if (!username) {
    return {
      total: 0,
      pullRequests: 0,
      issues: 0,
      commits: 0,
      contributions: []
    }
  }

  const githubClient = GitHubAPIClient.getInstance()
  const contributions: GitHubContribution[] = []

  logger.info('getUserContributions: Starting fetch', {
    data: {
      usernameHash: hashSensitiveData(username)
    },
    tags: { type: 'github', component: 'contributions' }
  })

  try {
    // Only log errors and warnings, not every fetch attempt

    // Use secure GitHub client for PRs
    const prsUrl = `https://api.github.com/search/issues?q=type:pr+author:${username}+repo:${REPO_OWNER}/${REPO_NAME}&sort=updated&order=desc&per_page=20`
    const prsResult = await githubClient.makeSecureRequest<any>(prsUrl)

    if (prsResult.data) {
      logger.info('getUserContributions: PRs fetched successfully', {
        data: {
          usernameHash: hashSensitiveData(username),
          prCount: prsResult.data.items?.length || 0
        },
        tags: { type: 'github', component: 'contributions' }
      })

      prsResult.data.items?.forEach((pr: any) => {
        contributions.push({
          type: 'pull_request',
          title: pr.title,
          url: pr.html_url,
          created_at: pr.created_at,
          state: pr.state,
          merged: !!pr.pull_request?.merged_at
        })
      })
    } else if (prsResult.error) {
      logger.warn('getUserContributions: PR fetch failed', {
        data: {
          usernameHash: hashSensitiveData(username),
          error: prsResult.error
        },
        tags: { type: 'github', component: 'contributions', error: 'pr-fetch-failed' }
      })
    }
    // Silently handle PR search failures - user may have no PRs or API may be temporarily unavailable

    // Use secure GitHub client for Issues
    const issuesUrl = `https://api.github.com/search/issues?q=type:issue+author:${username}+repo:${REPO_OWNER}/${REPO_NAME}&sort=updated&order=desc&per_page=20`
    const issuesResult = await githubClient.makeSecureRequest<any>(issuesUrl)

    if (issuesResult.data) {
      logger.info('getUserContributions: Issues fetched successfully', {
        data: {
          usernameHash: hashSensitiveData(username),
          issueCount: issuesResult.data.items?.length || 0
        },
        tags: { type: 'github', component: 'contributions' }
      })

      issuesResult.data.items?.forEach((issue: any) => {
        contributions.push({
          type: 'issue',
          title: issue.title,
          url: issue.html_url,
          created_at: issue.created_at,
          state: issue.state
        })
      })
    } else if (issuesResult.error) {
      logger.warn('getUserContributions: Issues fetch failed', {
        data: {
          usernameHash: hashSensitiveData(username),
          error: issuesResult.error
        },
        tags: { type: 'github', component: 'contributions', error: 'issues-fetch-failed' }
      })
    }
    // Silently handle Issues search failures - user may have no issues or API may be temporarily unavailable

    // Sort contributions by date (newest first)
    contributions.sort(
      (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    )

    const pullRequests = contributions.filter(c => c.type === 'pull_request').length
    const issues = contributions.filter(c => c.type === 'issue').length
    const commits = contributions.filter(c => c.type === 'commit').length

    const result = {
      total: pullRequests + issues + commits,
      pullRequests,
      issues,
      commits,
      contributions: contributions.slice(0, 10) // Limit to 10 most recent
    }

    logger.info('getUserContributions: Fetch completed successfully', {
      data: {
        usernameHash: hashSensitiveData(username),
        total: result.total,
        pullRequests: result.pullRequests,
        issues: result.issues,
        commits: result.commits
      },
      tags: { type: 'github', component: 'contributions' }
    })

    return result
  } catch (error) {
    // Log error without exposing sensitive information
    logger.error('Error fetching GitHub contributions', {
      data: {
        usernameHash: hashSensitiveData(username),
        error: error instanceof Error ? error.message : 'Unknown error'
      },
      tags: { type: 'github', security: 'error' }
    })
    return {
      total: 0,
      pullRequests: 0,
      issues: 0,
      commits: 0,
      contributions: []
    }
  }
}

/**
 * Get emoji icon for contribution type
 *
 * @param type - Type of GitHub contribution
 * @returns Emoji string representing the contribution type
 */
export function getContributionTypeIcon(type: GitHubContribution['type']) {
  switch (type) {
    case 'pull_request':
      return '🔀'
    case 'issue':
      return '🐛'
    case 'commit':
      return '📝'
    default:
      return '•'
  }
}

/**
 * Get human-readable label for contribution type
 *
 * @param type - Type of GitHub contribution
 * @returns Human-readable string for the contribution type
 */
export function getContributionTypeLabel(type: GitHubContribution['type']) {
  switch (type) {
    case 'pull_request':
      return 'Pull Request'
    case 'issue':
      return 'Issue'
    case 'commit':
      return 'Commit'
    default:
      return 'Contribution'
  }
}
