import { Badge } from '@thedaviddias/design-system/badge'
import { logger } from '@thedaviddias/logging'
import { Bug, FileText, GitPullRequest, User } from 'lucide-react'
import Link from 'next/link'
import { getContributionTypeLabel, getUserContributions } from '@/lib/github-contributions'
import { hashSensitiveData } from '@/lib/server-crypto'

interface ProfileContributionsProps {
  githubUsername: string | null
  isOwnProfile: boolean
  username: string | null
}

/**
 * ProfileContributions component that displays GitHub contributions for a user
 *
 * @param props - Component props
 * @param props.githubUsername - GitHub username to fetch contributions for
 * @param props.isOwnProfile - Whether this is the current user's own profile
 * @param props.username - Display username for messaging
 * @returns React component displaying contributions or empty state
 */
export async function ProfileContributions({
  githubUsername,
  isOwnProfile,
  username
}: ProfileContributionsProps) {
  // Get GitHub contributions for any valid GitHub username
  let contributions
  if (githubUsername) {
    logger.info('ProfileContributions: Fetching contributions', {
      data: {
        usernameHash: hashSensitiveData(githubUsername)
      },
      tags: { type: 'component', component: 'contributions' }
    })

    try {
      contributions = await getUserContributions(githubUsername)
      logger.info('ProfileContributions: Contributions fetched successfully', {
        data: {
          usernameHash: hashSensitiveData(githubUsername),
          total: contributions.total,
          pullRequests: contributions.pullRequests,
          issues: contributions.issues,
          commits: contributions.commits
        },
        tags: { type: 'component', component: 'contributions' }
      })
    } catch (error) {
      logger.error('ProfileContributions: Error fetching contributions', {
        data: {
          usernameHash: hashSensitiveData(githubUsername),
          error: error instanceof Error ? error.message : 'Unknown error'
        },
        tags: { type: 'component', component: 'contributions', error: 'fetch-failed' }
      })
      contributions = {
        total: 0,
        pullRequests: 0,
        issues: 0,
        commits: 0,
        contributions: []
      }
    }
  } else {
    contributions = {
      total: 0,
      pullRequests: 0,
      issues: 0,
      commits: 0,
      contributions: []
    }
  }

  return (
    <section className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold">Recent Contributions</h2>
        {contributions.total > 0 && <Badge variant="secondary">{contributions.total} total</Badge>}
      </div>

      {contributions.contributions.length > 0 ? (
        <div className="space-y-3">
          {contributions.contributions.map((contribution, index) => (
            <div
              key={index}
              className="flex items-center gap-3 p-4 rounded-lg border hover:bg-muted/50 transition-colors"
            >
              <div className="flex-shrink-0">
                {contribution.type === 'pull_request' && (
                  <GitPullRequest className="w-4 h-4 text-blue-500" />
                )}
                {contribution.type === 'issue' && <Bug className="w-4 h-4 text-red-500" />}
                {contribution.type === 'commit' && <FileText className="w-4 h-4 text-green-500" />}
              </div>

              <div className="flex-grow min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-sm font-medium text-muted-foreground">
                    {getContributionTypeLabel(contribution.type)}
                  </span>
                  {contribution.state && (
                    <Badge
                      variant={
                        contribution.state === 'merged' || contribution.merged
                          ? 'default'
                          : 'outline'
                      }
                      className="text-xs"
                    >
                      {contribution.merged ? 'merged' : contribution.state}
                    </Badge>
                  )}
                </div>

                <Link
                  href={contribution.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="block font-medium hover:text-primary transition-colors truncate"
                >
                  {contribution.title}
                </Link>

                <p className="text-sm text-muted-foreground mt-1">
                  {new Date(contribution.created_at).toLocaleDateString('en-US', {
                    month: 'short',
                    day: 'numeric',
                    year: 'numeric'
                  })}
                </p>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="text-center py-12 text-muted-foreground">
          <User className="w-16 h-16 mx-auto mb-4 opacity-50" />
          <h3 className="text-lg font-medium mb-2">No contributions found</h3>
          <p className="text-sm">
            {githubUsername
              ? 'No contributions to llms-txt-hub yet'
              : isOwnProfile
                ? 'Sign in with GitHub to display your contributions'
                : 'GitHub account not verified'}
          </p>
          {isOwnProfile && !githubUsername && username && (
            <p className="text-xs mt-2 text-amber-600">
              Note: Contributions only show for GitHub OAuth verified accounts
            </p>
          )}
        </div>
      )}
    </section>
  )
}
