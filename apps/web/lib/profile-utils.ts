export { hasSharedInfo } from './member-shared'

/**
 * Generate a URL slug from user data
 * @param user - User object with username, metadata, and ID
 * @returns URL slug string
 */
export function generateSlugFromUser(user: any): string {
  if (!user) return ''

  // Handle Clerk user format
  const username =
    user.username ||
    user.publicMetadata?.github_username ||
    user.user_metadata?.user_name ||
    user.user_metadata?.github_username

  // If no username, return the full user ID (not sliced)
  if (!username) return user.id
  return username
}

/**
 * Generate display name from user data
 * @param user - User object to generate display name from
 * @returns Display name string
 */
export function generateDisplayName(user: any): string {
  return user.firstName && user.lastName
    ? `${user.firstName} ${user.lastName}`
    : user.firstName || user.lastName || user.username || `User ${user.id.slice(-6).toUpperCase()}`
}

/**
 * Get username from various user metadata sources
 * @param user - User object to extract username from
 * @returns Username string or null
 */
export function getUsernameFromMetadata(user: any): string | null {
  return (
    user.username || user.user_metadata?.user_name || user.publicMetadata?.github_username || null
  )
}
