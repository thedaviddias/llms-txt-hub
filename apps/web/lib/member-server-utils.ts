/**
 * Server-side member processing utilities
 */

import { logger } from '@thedaviddias/logging'
import { revalidateTag, unstable_cache } from 'next/cache'
import { getClerk } from '@/lib/clerk'
import { hasSharedInfo, type Member } from '@/lib/member-shared'
import SafeRedis, { CACHE_KEYS } from '@/lib/redis'
import { hashSensitiveData } from '@/lib/server-crypto'

export type { Member } from '@/lib/member-shared'

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

  // Skip contribution checking for performance - GitHub API rate limits
  // Contribution data can be fetched client-side when needed
  hasContributions = false

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

const REDIS_MEMBERS_KEY = `${CACHE_KEYS.MEMBER_DATA}all-v5`
const REDIS_MEMBERS_TTL = 86400 // 24 hours in Redis (persistent across restarts)

/**
 * Invalidate both tiers of the members cache.
 * Call this from Clerk webhooks when users are created/updated/deleted.
 */
export async function invalidateMembersCache(): Promise<void> {
  await SafeRedis.del(REDIS_MEMBERS_KEY)
  revalidateTag('members', { expire: 0 })
  logger.info('Members cache invalidated (Redis + unstable_cache)', {
    tags: { type: 'page' }
  })
}

/**
 * Fetch all members from Clerk API with batched pagination.
 * Returns the processed member array or throws on failure.
 */
async function fetchMembersFromClerk(): Promise<Member[]> {
  const clerk = getClerk()
  if (!clerk) {
    logger.warn('Clerk client not available, using fallback member data', {
      tags: { type: 'library' },
      data: {
        reason: process.env.CLERK_SECRET_KEY ? 'init_failed' : 'missing_secret'
      }
    })
    return []
  }

  const allUsers: Member[] = []
  let offset = 0
  const limit = 500
  let fetchError = false

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

      if (response.data.length < limit) break

      offset += limit
    } catch (error) {
      const errorInfo: Record<string, unknown> = { offset }

      if (error instanceof Error) {
        errorInfo.message = error.message || '(empty message)'
        errorInfo.name = error.name
      }
      if (error && typeof error === 'object') {
        if ('status' in error) {
          errorInfo.status = (error as { status: unknown }).status
        }
        if ('errors' in error) {
          const errWithErrors = error as { errors: unknown }
          if (Array.isArray(errWithErrors.errors)) {
            errorInfo.clerkErrors = errWithErrors.errors.map(
              (e: { code?: string; message?: string; longMessage?: string }) => ({
                code: e.code,
                message: e.message,
                longMessage: e.longMessage
              })
            )
          }
        }
      }

      logger.error('Error fetching batch from Clerk', {
        data: errorInfo,
        tags: { type: 'page', security: 'error' }
      })
      fetchError = true
      break
    }
  }

  if (allUsers.length === 0 && fetchError) {
    throw new Error('Clerk API failed before fetching any members')
  }

  return allUsers
}

/**
 * Two-tier cached member fetching:
 *   Tier 1: unstable_cache (in-process, 5 min) — avoids Redis round-trip
 *   Tier 2: Upstash Redis (persistent, 1 hour) — avoids Clerk API calls
 *   Source: Clerk API (paginated) — only called on full cache miss
 *
 * On Clerk failure, falls back to stale Redis data if available.
 */
export const getCachedMembers = unstable_cache(
  async (): Promise<Member[]> => {
    // Tier 2: Check Redis for cached members
    const cached = await SafeRedis.get<Member[]>(REDIS_MEMBERS_KEY)
    if (cached && Array.isArray(cached) && cached.length > 0) {
      logger.info('Members loaded from Redis cache', {
        data: { count: cached.length },
        tags: { type: 'page' }
      })
      return cached
    }

    // Source: Fetch from Clerk API
    try {
      const members = await fetchMembersFromClerk()

      logger.info('Fetched all members from Clerk', {
        data: { totalCount: members.length },
        tags: { type: 'page', security: 'audit' }
      })

      // Write-through to Redis for next time
      if (members.length > 0) {
        await SafeRedis.set(REDIS_MEMBERS_KEY, members, REDIS_MEMBERS_TTL)
      }

      return members
    } catch (error) {
      // Clerk failed — try stale Redis data one more time (key may have been
      // evicted between the check above and now, but worth a retry)
      const stale = await SafeRedis.get<Member[]>(REDIS_MEMBERS_KEY)
      if (stale && Array.isArray(stale) && stale.length > 0) {
        logger.warn('Clerk API failed, serving stale Redis data', {
          data: { count: stale.length },
          tags: { type: 'page', security: 'error' }
        })
        return stale
      }

      const errorInfo: Record<string, unknown> =
        error instanceof Error
          ? { message: error.message, name: error.name }
          : { message: 'Unknown error occurred' }

      if (error && typeof error === 'object') {
        if ('status' in error && error.status) {
          errorInfo.status = error.status
        }
        if ('code' in error && error.code) {
          errorInfo.code = error.code
        }
      }

      logger.error('Error fetching members — no cache available', {
        data: errorInfo,
        tags: { type: 'page', security: 'error' }
      })
      throw error
    }
  },
  ['all-members-v5'],
  {
    revalidate: 300, // In-process cache: 5 minutes (Redis handles the longer TTL)
    tags: ['members']
  }
)
