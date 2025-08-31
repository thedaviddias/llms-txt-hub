import { createClerkClient } from '@clerk/backend'
import { logger } from '@thedaviddias/logging'
import { getUserContributions } from './github-contributions'

// Create Clerk client only if secret key is available
let clerk: ReturnType<typeof createClerkClient> | null = null

if (process.env.CLERK_SECRET_KEY) {
  try {
    clerk = createClerkClient({
      secretKey: process.env.CLERK_SECRET_KEY
    })
  } catch (error) {
    logger.warn('Failed to initialize Clerk client:', { 
      data: error, 
      tags: { type: 'library' } 
    })
    clerk = null
  }
}

export interface Member {
  id: string
  firstName?: string | null
  lastName?: string | null
  username?: string | null
  imageUrl?: string | null
  createdAt: string
  publicMetadata?: {
    github_username?: string | null
    migrated_from?: string | null
  }
  hasContributions?: boolean
}

/**
 * Check if user has shared information for public member visibility
 * @param user - User object to check
 * @returns True if user should be visible in member listings
 */
function hasSharedInfo(user: any): boolean {
  // Exclude users who explicitly set their profile to private
  if (user.publicMetadata?.isProfilePrivate === true) {
    return false
  }

  // Exclude users with "null" string values
  if (user.firstName === 'null' || user.lastName === 'null') {
    return false
  }

  // A user must have either a name OR a username to be visible
  const hasName = !!(user.firstName && user.firstName !== '')
  const hasUsername = !!(
    user.username ||
    user.user_metadata?.user_name ||
    user.publicMetadata?.github_username ||
    user.publicMetadata?.githubUsername
  )

  // Users need at least a name or username to appear in public listings
  return hasName || hasUsername
}

/**
 * Generate fallback member data for development/CI environments
 * @param limit - Number of members to generate
 * @returns Member[]
 */
function generateFallbackMembers(limit: number): Member[] {
  return Array.from({ length: limit }, (_, i) => {
    const id = `demo-user-${i + 1}`
    return {
      id,
      firstName: 'Demo',
      lastName: `User ${i + 1}`,
      username: `demo_user_${i + 1}`,
      imageUrl: `https://api.dicebear.com/7.x/avataaars/svg?seed=${id}`,
      createdAt: new Date(
        Date.now() - Math.random() * 365 * 24 * 60 * 60 * 1000
      ).toISOString(),
      publicMetadata: {
        github_username: Math.random() > 0.5 ? `github-demo${i + 1}` : null,
        migrated_from: null
      },
      hasContributions: Math.random() > 0.3 // 70% chance of having contributions
    }
  })
}

/**
 * Get the latest members for homepage display
 * @param limit - Number of members to fetch (default: 6)
 * @returns Promise<Member[]>
 */
export async function getLatestMembers(limit = 6): Promise<Member[]> {
  // If Clerk client is not available (missing credentials or initialization failed)
  if (!clerk) {
    logger.warn('Clerk client not available, using fallback member data', {
      tags: { type: 'library' }
    })
    return generateFallbackMembers(limit)
  }

  try {
    // Fetch a reasonable number of recent users to filter from
    const response = await clerk.users.getUserList({
      limit: Math.min(limit * 3, 100), // Fetch more than needed to account for private profiles
      offset: 0,
      orderBy: '-created_at'
    })

    const validUsers = response.data.filter(hasSharedInfo)

    // Take only the requested number of valid users and check contributions
    const selectedUsers = validUsers.slice(0, limit)

    const latestMembers = await Promise.all(
      selectedUsers.map(async user => {
        const username = user.username || user.publicMetadata?.github_username
        let hasContributions = false

        if (username && typeof username === 'string') {
          try {
            const contributions = await getUserContributions(username)
            hasContributions = contributions.total > 0
          } catch {
            hasContributions = false
          }
        }

        return {
          id: user.id,
          firstName: user.firstName || null,
          lastName: user.lastName || null,
          username: user.username || null,
          imageUrl: user.imageUrl || null,
          createdAt: user.createdAt.toString(),
          publicMetadata: {
            github_username: (user.publicMetadata?.github_username as string) || null,
            migrated_from: (user.publicMetadata?.migrated_from as string) || null
          },
          hasContributions
        }
      })
    )

    return latestMembers
  } catch (error) {
    logger.error('Error fetching latest members from Clerk, using fallback data:', { 
      data: error, 
      tags: { type: 'library' } 
    })
    
    // Return fallback data instead of empty array
    return generateFallbackMembers(limit)
  }
}
