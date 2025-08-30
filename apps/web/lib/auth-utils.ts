import type { User } from '@clerk/nextjs/server'

export type AuthLevel = 'anonymous' | 'email_only' | 'github_connected' | 'github_full'

/**
 * Type guard to validate if a string is a valid AuthLevel
 *
 * @param value - String value to check
 *
 * @returns True if value is a valid AuthLevel
 */
function isValidAuthLevel(value: string): value is AuthLevel {
  return ['anonymous', 'email_only', 'github_connected', 'github_full'].includes(value)
}

export interface UserAuthInfo {
  authLevel: AuthLevel
  canSubmitPR: boolean
  githubConnected: boolean
  email: string | null
  githubUsername?: string | null
}

/**
 * Determines the authentication level and capabilities of a user
 * @param user - The user object from Clerk or null
 * @returns UserAuthInfo object with auth level and permissions
 */
export function getUserAuthInfo(user: User | null): UserAuthInfo {
  if (!user) {
    return {
      authLevel: 'anonymous',
      canSubmitPR: false,
      githubConnected: false,
      email: null
    }
  }

  // Check if user has GitHub connected
  const hasGitHub = user.externalAccounts?.some(account => account.provider === 'oauth_github')

  // Check metadata for auth level (if set)
  const metadata = user.publicMetadata || {}
  const authLevel =
    'authLevel' in metadata && typeof metadata.authLevel === 'string'
      ? metadata.authLevel
      : hasGitHub
        ? 'github_connected'
        : 'email_only'

  return {
    authLevel: isValidAuthLevel(authLevel) ? authLevel : 'email_only',
    canSubmitPR: Boolean(('canSubmitPR' in metadata && metadata.canSubmitPR) || hasGitHub),
    githubConnected: hasGitHub,
    email: user.emailAddresses?.[0]?.emailAddress || null,
    githubUsername: hasGitHub ? user.username : null
  }
}

/**
 * Checks if a user can submit pull requests via GitHub integration
 * @param user - The user object from Clerk or null
 * @returns True if user has GitHub connected and PR submission permissions
 */
export function canUserSubmitViaGitHub(user: User | null): boolean {
  const authInfo = getUserAuthInfo(user)
  return authInfo.githubConnected && authInfo.canSubmitPR
}

/**
 * Determines if a user is authenticated only via email (no GitHub connection)
 * @param user - The user object from Clerk or null
 * @returns True if user has email-only authentication
 */
export function isEmailOnlyUser(user: User | null): boolean {
  const authInfo = getUserAuthInfo(user)
  return authInfo.authLevel === 'email_only'
}
