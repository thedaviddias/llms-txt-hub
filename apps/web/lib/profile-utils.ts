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
 * Check if user has shared information for public profile visibility
 * @param user - User object to check
 * @returns True if user has shared info, false otherwise
 */
export function hasSharedInfo(user: any): boolean {
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
    user.publicMetadata?.github_username ||
    user.publicMetadata?.githubUsername
  )

  return hasName || hasUsername
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
