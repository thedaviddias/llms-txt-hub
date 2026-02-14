export interface MemberPublicMetadata {
  github_username?: string | null
  migrated_from?: string | null
  isProfilePrivate?: boolean
}

export interface Member {
  id: string
  firstName?: string | null
  lastName?: string | null
  username?: string | null
  imageUrl?: string | null
  createdAt: string
  publicMetadata?: MemberPublicMetadata
  hasContributions?: boolean
}

interface SharedInfoUser {
  firstName?: string | null
  lastName?: string | null
  username?: string | null
  publicMetadata?: {
    github_username?: string | null
    githubUsername?: string | null
    isProfilePrivate?: boolean
  }
  user_metadata?: {
    user_name?: string | null
    github_username?: string | null
  }
}

/**
 * Check if user has shared enough information to be displayed publicly.
 */
export function hasSharedInfo(user: SharedInfoUser | null | undefined): boolean {
  if (!user) return false

  // Exclude users who explicitly set their profile to private
  if (user.publicMetadata?.isProfilePrivate === true) {
    return false
  }

  // Exclude users with "null" string values
  if (user.firstName === 'null' || user.lastName === 'null') {
    return false
  }

  // A user should be visible if they have:
  // - A first name OR
  // - A username (Clerk or GitHub)
  const hasName = !!(user.firstName && user.firstName !== '')
  const hasUsername = !!(
    user.username ||
    user.user_metadata?.user_name ||
    user.user_metadata?.github_username ||
    user.publicMetadata?.github_username ||
    user.publicMetadata?.githubUsername
  )

  return hasName || hasUsername
}
