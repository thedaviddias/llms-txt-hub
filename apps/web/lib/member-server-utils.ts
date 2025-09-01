/**
 * Server-side member processing utilities
 */

import { createClerkClient } from '@clerk/backend'
import { logger } from '@thedaviddias/logging'
import { unstable_cache } from 'next/cache'
import { hashSensitiveData } from '@/lib/server-crypto'

const clerk = createClerkClient({
  secretKey: process.env.CLERK_SECRET_KEY!
})

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
    isProfilePrivate?: boolean
  }
  hasContributions?: boolean
}

/**
 * Check if user has shared enough information to be displayed publicly
 *
 * @param user - User object from Clerk
 * @returns True if user should be visible in public listings
 */
export function hasSharedInfo(user: any): boolean {
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
    user.publicMetadata?.github_username ||
    user.publicMetadata?.githubUsername
  )

  return hasName || hasUsername
}

/**
 * Process a single user and check their contributions
 *
 * @param user - Raw user data from Clerk
 * @returns Processed member object with contribution status
 */
export async function processUser(user: any): Promise<Member> {
  let hasContributions = false

  // First check for OAuth-verified GitHub account
  let githubUsername: string | null = null
  if (user.externalAccounts) {
    const githubAccount = user.externalAccounts.find(
      (account: any) => account.provider === 'oauth_github'
    )
    if (githubAccount?.username) {
      githubUsername = githubAccount.username
      logger.info('Found OAuth GitHub account', {
        data: { usernameHash: hashSensitiveData(githubUsername || '') },
        tags: { type: 'members', security: 'audit' }
      })
    }
  }

  // Fallback to metadata username (for migrated Supabase users)
  if (!githubUsername) {
    githubUsername = user.publicMetadata?.github_username || user.username
    if (githubUsername) {
      logger.info('Using metadata GitHub username (migrated user)', {
        data: { usernameHash: hashSensitiveData(githubUsername || '') },
        tags: { type: 'members', security: 'audit' }
      })
    }
  }

  // Check contributions for any valid GitHub username
  if (githubUsername && typeof githubUsername === 'string') {
    try {
      const { getUserContributions } = await import('@/lib/github-contributions')
      const contributions = await getUserContributions(githubUsername)
      hasContributions = contributions.total > 0

      // Log for debugging
      logger.info('Contribution check completed', {
        data: {
          usernameHash: hashSensitiveData(githubUsername || ''),
          hasContributions,
          total: contributions.total,
          pullRequests: contributions.pullRequests,
          issues: contributions.issues
        },
        tags: { type: 'members', security: 'audit' }
      })
    } catch (error) {
      logger.warn('Contribution check failed', {
        data: {
          usernameHash: hashSensitiveData(githubUsername || ''),
          error: error instanceof Error ? error.message : 'Unknown error'
        },
        tags: { type: 'members', security: 'error' }
      })
      hasContributions = false
    }
  }

  return {
    id: user.id,
    firstName: user.firstName,
    lastName: user.lastName,
    username: user.username,
    imageUrl: user.imageUrl,
    createdAt: user.createdAt ? new Date(user.createdAt).toISOString() : new Date().toISOString(),
    publicMetadata: {
      github_username: (user.publicMetadata?.github_username as string) || null,
      migrated_from: (user.publicMetadata?.migrated_from as string) || null,
      isProfilePrivate: (user.publicMetadata?.isProfilePrivate as boolean) || false
    },
    hasContributions
  }
}

/**
 * Generate demo data for development/fallback
 * Uses deterministic values based on index for consistent E2E testing
 *
 * @param count - Number of demo users to generate
 * @returns Array of demo member objects
 */
export function generateDemoData(count: number): Member[] {
  return Array.from({ length: count }, (_, i) => {
    // Deterministic date: start from fixed date (2024-01-01) and add days based on index
    // This ensures consistent dates across all test runs
    const baseDate = new Date(Date.UTC(2024, 0, 1)) // January 1, 2024 UTC
    const createdAt = new Date(baseDate.getTime() + i * 86_400_000).toISOString() // Add i days

    // Deterministic github_username: even indices get github username
    const github_username = i % 2 === 0 ? `github-demo${i + 1}` : null

    // Deterministic hasContributions: 70% have contributions (i % 10 < 7)
    const hasContributions = i % 10 < 7

    return {
      id: `demo-user-${i + 1}`,
      firstName: 'Demo',
      lastName: `User ${i + 1}`,
      username: `demo_user_${i + 1}`,
      imageUrl: `https://api.dicebear.com/7.x/avataaars/svg?seed=demo-${i + 1}`,
      createdAt,
      publicMetadata: {
        github_username,
        migrated_from: null
      },
      hasContributions
    }
  })
}

// Cache the members data with Next.js 15's unstable_cache
export const getCachedMembers = unstable_cache(
  async (): Promise<Member[]> => {
    try {
      // Check if Clerk is properly configured
      if (!process.env.CLERK_SECRET_KEY) {
        logger.warn('CLERK_SECRET_KEY not configured, using demo data')
        return generateDemoData(200)
      }

      // Fetch ALL users from Clerk (with batching for large datasets)
      const allUsers: Member[] = []
      let offset = 0
      const limit = 500

      while (true) {
        try {
          const response = await clerk.users.getUserList({
            limit,
            offset,
            orderBy: '-created_at'
          })

          if (!response.data || response.data.length === 0) break

          const validUsers = await Promise.all(response.data.filter(hasSharedInfo).map(processUser))

          allUsers.push(...validUsers)

          // If we got less than the limit, we've reached the end
          if (response.data.length < limit) break

          offset += limit
        } catch (error) {
          logger.error('Error fetching batch from Clerk', {
            data: {
              error: error instanceof Error ? error.message : 'Unknown error',
              offset
            },
            tags: { type: 'page', security: 'error' }
          })
          break
        }
      }

      logger.info('Fetched all members for static generation', {
        data: { totalCount: allUsers.length },
        tags: { type: 'page', security: 'audit' }
      })

      return allUsers
    } catch (error) {
      // Log sanitized error information without raw Error object
      const errorInfo: Record<string, unknown> =
        error instanceof Error
          ? {
              message: error.message,
              name: error.name
            }
          : { message: 'Unknown error occurred' }

      // Add optional error properties if they exist
      if (error && typeof error === 'object') {
        if ('status' in error && error.status) {
          errorInfo.status = error.status
        }
        if ('code' in error && error.code) {
          errorInfo.code = error.code
        }
      }

      logger.error('Error fetching members', {
        data: errorInfo,
        tags: { type: 'page', security: 'error' }
      })
      return generateDemoData(50)
    }
  },
  ['all-members-v4-migrated'], // Changed cache key to support migrated users
  {
    revalidate: 1800, // Cache for 30 minutes
    tags: ['members']
  }
)
