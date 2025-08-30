import { ProfileHeader } from '@/components/profile/profile-header'
import { UserMessageBanner } from '@/components/ui/user-message-banner'
import { getContributionTypeLabel, getUserContributions } from '@/lib/github-contributions'
import { generateDisplayName, getUsernameFromMetadata, hasSharedInfo } from '@/lib/profile-utils'
import { generateDynamicMetadata } from '@/lib/seo/seo-config'
import { hashSensitiveData } from '@/lib/server-crypto'
import { findUserBySlug } from '@/lib/user-search'
import { auth } from '@thedaviddias/auth'
import { Badge } from '@thedaviddias/design-system/badge'
import { Breadcrumb } from '@thedaviddias/design-system/breadcrumb'
import { logger } from '@thedaviddias/logging'
import { Bug, FileText, GitPullRequest, User } from 'lucide-react'
import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'

// Force dynamic rendering to ensure fresh data
export const dynamic = 'force-dynamic'

// Revalidate every 5 minutes to ensure fresh contribution data
export const revalidate = 300

interface ProfilePageProps {
  params: Promise<{
    slug: string
  }>
}

/**
 * Generate metadata for the profile page
 * @param params - Route parameters containing the slug
 * @returns Promise resolving to Next.js Metadata object
 */
export async function generateMetadata({ params }: ProfilePageProps): Promise<Metadata> {
  const { slug } = await params
  const profileUser = await findUserBySlug(slug)

  if (!profileUser || !hasSharedInfo(profileUser)) {
    return {
      title: 'Profile Not Found | llms.txt hub',
      description: 'The requested profile could not be found.'
    }
  }

  const displayName = generateDisplayName(profileUser)
  const username = getUsernameFromMetadata(profileUser)

  return generateDynamicMetadata({
    type: 'member',
    name: `${displayName}${username ? ` (@${username})` : ''}`,
    description: `View ${displayName}'s profile on llms.txt hub. Discover their submitted llms.txt files and contributions to the community.`,
    slug: slug,
    additionalKeywords: ['community member', 'contributor', 'llms.txt submissions']
  })
}

export default async function ProfilePage({ params }: ProfilePageProps) {
  const session = await auth()
  const { slug } = await params

  // Add cache control headers to prevent browser caching
  const headers = new Headers()
  headers.set('Cache-Control', 'no-cache, no-store, must-revalidate')
  headers.set('Pragma', 'no-cache')
  headers.set('Expires', '0')

  logger.info('ProfilePage: Attempting to load profile', {
    data: {
      slugHash: hashSensitiveData(slug),
      hasSession: !!session?.user?.id
    },
    tags: { type: 'page', security: 'audit' }
  })

  // Find the user by slug
  const profileUser = await findUserBySlug(slug)

  if (!profileUser) {
    logger.warn('ProfilePage: User not found', {
      data: { slugHash: hashSensitiveData(slug) },
      tags: { type: 'page', security: 'audit' }
    })
    notFound()
  }

  logger.info('ProfilePage: User found', {
    data: {
      slugHash: hashSensitiveData(slug),
      userIdHash: hashSensitiveData(profileUser.id),
      hasUsername: !!profileUser.username,
      hasGithubUsername: !!profileUser.publicMetadata?.github_username,
      isProfilePrivate: profileUser.publicMetadata?.isProfilePrivate === true,
      hasFirstName: !!profileUser.firstName,
      hasLastName: !!profileUser.lastName
    },
    tags: { type: 'page', security: 'audit' }
  })

  // Check if this is the current user's own profile
  const currentUserId = session?.user?.id
  const isOwnProfile = !!(
    currentUserId &&
    (currentUserId === slug || currentUserId === profileUser.id)
  )

  // Check if profile is private and deny access if not owner
  const isProfilePrivate = profileUser.publicMetadata?.isProfilePrivate === true
  if (isProfilePrivate && !isOwnProfile) {
    logger.info('ProfilePage: Profile is private, denying access', {
      data: {
        slugHash: hashSensitiveData(slug),
        userIdHash: hashSensitiveData(profileUser.id)
      },
      tags: { type: 'page', security: 'access-denied' }
    })
    notFound()
  }

  // Check profile visibility and completeness
  const hasInfo = hasSharedInfo(profileUser)
  const needsNameOrUsername = !profileUser.firstName && !getUsernameFromMetadata(profileUser)

  if (!isOwnProfile && !hasInfo) {
    logger.info('ProfilePage: User has no shared info, denying access', {
      data: {
        slugHash: hashSensitiveData(slug),
        userIdHash: hashSensitiveData(profileUser.id)
      },
      tags: { type: 'page', security: 'access-denied' }
    })
    notFound()
  }

  // For email-only users without names, show a privacy-friendly identifier
  const displayName = generateDisplayName(profileUser)
  const username = getUsernameFromMetadata(profileUser)
  const bio = profileUser.publicMetadata?.bio
  const work = profileUser.publicMetadata?.work
  const website = profileUser.publicMetadata?.website

  const joinDate = new Date(profileUser.createdAt).toLocaleDateString('en-US', {
    month: 'long',
    year: 'numeric'
  })

  // First check for OAuth-verified GitHub account
  let githubUsername: string | null = null
  if (profileUser.externalAccounts) {
    const githubAccount = profileUser.externalAccounts.find(
      (account: any) => account.provider === 'oauth_github'
    )
    if (githubAccount) {
      githubUsername = githubAccount.username
    }
  }

  // Fallback to metadata username (for migrated Supabase users)
  if (!githubUsername) {
    githubUsername = getUsernameFromMetadata(profileUser)
  }

  // Get GitHub contributions for any valid GitHub username
  let contributions
  if (githubUsername) {
    logger.info('ProfilePage: Fetching contributions', {
      data: {
        usernameHash: hashSensitiveData(githubUsername),
        hasSession: !!session?.user?.id
      },
      tags: { type: 'page', component: 'contributions' }
    })

    try {
      contributions = await getUserContributions(githubUsername)
      logger.info('ProfilePage: Contributions fetched successfully', {
        data: {
          usernameHash: hashSensitiveData(githubUsername),
          total: contributions.total,
          pullRequests: contributions.pullRequests,
          issues: contributions.issues,
          commits: contributions.commits
        },
        tags: { type: 'page', component: 'contributions' }
      })
    } catch (error) {
      logger.error('ProfilePage: Error fetching contributions', {
        data: {
          usernameHash: hashSensitiveData(githubUsername),
          error: error instanceof Error ? error.message : 'Unknown error'
        },
        tags: { type: 'page', component: 'contributions', error: 'fetch-failed' }
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
    <div className="container max-w-6xl mx-auto px-6 py-8">
      {/* Breadcrumb Navigation */}
      <div className="mb-12">
        <Breadcrumb
          items={[
            { name: 'Members', href: '/members/1' },
            { name: displayName, href: `/u/${slug}` }
          ]}
        />
      </div>

      {/* Profile setup notice for users with incomplete profiles */}
      {isOwnProfile && needsNameOrUsername && (
        <div className="mb-6">
          <UserMessageBanner
            icon="user"
            title="Your profile is hidden from public view"
            description="Add your first name or choose a username in Edit Profile to make your profile visible in the members directory. Without at least one of these, your profile won't appear in public listings."
            variant="warning"
          />
        </div>
      )}

      {/* Additional notice for users without names but with username */}
      {isOwnProfile && !profileUser.firstName && !profileUser.lastName && profileUser.username && (
        <div className="mb-6">
          <UserMessageBanner
            icon="user"
            title="Complete your profile"
            description="Adding your name will help other members recognize you"
            variant="info"
          />
        </div>
      )}

      {/* Profile Header */}
      <ProfileHeader
        profileUser={{
          id: profileUser.id,
          firstName: profileUser.firstName,
          lastName: profileUser.lastName,
          username: profileUser.username,
          imageUrl: profileUser.imageUrl,
          createdAt: profileUser.createdAt
        }}
        displayName={displayName}
        username={username}
        githubUsername={githubUsername}
        bio={bio}
        work={work}
        website={website}
        joinDate={joinDate}
        isOwnProfile={isOwnProfile}
        hasContributions={contributions.total > 0}
        isProfilePrivate={isProfilePrivate}
        isProfileIncomplete={needsNameOrUsername}
      />

      {/* Recent Contributions Section */}
      <section className="space-y-6">
        <div className="flex items-center justify-between">
          <h2 className="text-2xl font-bold">Recent Contributions</h2>
          {contributions.total > 0 && (
            <Badge variant="secondary">{contributions.total} total</Badge>
          )}
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
                  {contribution.type === 'commit' && (
                    <FileText className="w-4 h-4 text-green-500" />
                  )}
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
    </div>
  )
}
