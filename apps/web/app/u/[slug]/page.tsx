import { auth } from '@thedaviddias/auth'
import { Breadcrumb } from '@thedaviddias/design-system/breadcrumb'
import { logger } from '@thedaviddias/logging'
import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { ProfileContributions } from '@/components/profile/profile-contributions'
import { ProfileHeader } from '@/components/profile/profile-header'
import { UserMessageBanner } from '@/components/ui/user-message-banner'
import { generateDisplayName, getUsernameFromMetadata, hasSharedInfo } from '@/lib/profile-utils'
import { generateDynamicMetadata } from '@/lib/seo/seo-config'
import { hashSensitiveData } from '@/lib/server-crypto'
import { findUserBySlug } from '@/lib/user-search'

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
        hasContributions={false} // Will be determined by ProfileContributions component
        isProfilePrivate={isProfilePrivate}
        isProfileIncomplete={needsNameOrUsername}
      />

      {/* Recent Contributions Section */}
      <ProfileContributions
        githubUsername={githubUsername}
        isOwnProfile={isOwnProfile}
        username={username}
      />
    </div>
  )
}
