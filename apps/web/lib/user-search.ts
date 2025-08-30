import { createClerkClient } from '@clerk/backend'
import { logger } from '@thedaviddias/logging'
import { generateSlugFromUser } from './profile-utils'

const clerk = createClerkClient({
  secretKey: process.env.CLERK_SECRET_KEY!
})

/**
 * Find a user by their slug (username, GitHub username, or user ID)
 * @param slug - The slug to search for
 * @returns User object if found, null otherwise
 */
export async function findUserBySlug(slug: string) {
  logger.info('findUserBySlug: Starting search', { data: { slug }, tags: { type: 'page' } })

  try {
    // First, try to find by ID if slug looks like a Clerk user ID
    if (slug.startsWith('user_')) {
      try {
        const user = await clerk.users.getUser(slug)
        logger.info('findUserBySlug: Found user by ID', {
          data: { slug, userId: user.id },
          tags: { type: 'page' }
        })
        return user
      } catch (_error) {
        logger.debug('User not found by ID, trying other methods', { data: { slug } })
        // If not found by ID, continue to search by username
      }
    }

    // Try to search by username first (more efficient)
    try {
      const usernameSearch = await clerk.users.getUserList({
        username: [slug],
        limit: 10
      })

      logger.info('findUserBySlug: Username search results', {
        data: { slug, resultCount: usernameSearch.data.length },
        tags: { type: 'page' }
      })

      if (usernameSearch.data.length > 0) {
        // Find exact match
        const exactMatch = usernameSearch.data.find(u => u.username === slug)
        if (exactMatch) {
          logger.info('findUserBySlug: Found user by username', {
            data: { slug, userId: exactMatch.id, username: exactMatch.username },
            tags: { type: 'page' }
          })
          return exactMatch
        }
      }
    } catch (error) {
      logger.debug('Username search failed, trying full search', { data: { slug, error } })
    }

    // Also try searching without the array syntax which might work better
    try {
      const directSearch = await clerk.users.getUserList({
        limit: 500,
        orderBy: '-created_at'
      })

      // Look for exact username or github_username match
      const matchedUser = directSearch.data.find(
        u =>
          u.username === slug ||
          u.publicMetadata?.github_username === slug ||
          u.publicMetadata?.githubUsername === slug ||
          u.externalAccounts?.find(
            (account: any) => account.provider === 'oauth_github' && account.username === slug
          )
      )

      if (matchedUser) {
        logger.info('findUserBySlug: Found user in direct search', {
          data: {
            slug,
            userId: matchedUser.id,
            username: matchedUser.username,
            githubUsername: matchedUser.publicMetadata?.github_username
          },
          tags: { type: 'page' }
        })
        return matchedUser
      }
    } catch (error) {
      logger.debug('Direct search failed, continuing to batch search', { data: { slug, error } })
    }

    // Fallback: Search through users in batches (less efficient but comprehensive)
    // Limit the search to avoid timeout issues
    const maxUsersToSearch = 2000
    let allUsers: any[] = []
    let offset = 0
    const limit = 100 // Reduced limit to avoid rate limiting

    while (offset < maxUsersToSearch) {
      try {
        const response = await clerk.users.getUserList({
          limit: Math.min(limit, maxUsersToSearch - offset),
          offset,
          orderBy: '-created_at'
        })

        if (!response.data || response.data.length === 0) break

        // Check each batch as we get it to return early if found
        for (const user of response.data) {
          // Check if username matches
          if (user.username === slug) {
            logger.info('findUserBySlug: Found user by username in batch', {
              data: { slug, userId: user.id, username: user.username },
              tags: { type: 'page' }
            })
            return user
          }

          // Check if github username matches in various places
          if (
            user.publicMetadata?.github_username === slug ||
            user.publicMetadata?.githubUsername === slug
          ) {
            logger.info('findUserBySlug: Found user by github_username in batch', {
              data: {
                slug,
                userId: user.id,
                username: user.username,
                githubUsername:
                  user.publicMetadata.github_username || user.publicMetadata.githubUsername
              },
              tags: { type: 'page' }
            })
            return user
          }

          // Check external accounts for GitHub username
          const githubAccount = user.externalAccounts?.find(
            (account: any) => account.provider === 'oauth_github' && account.username === slug
          )
          if (githubAccount) {
            logger.info('findUserBySlug: Found user by GitHub external account', {
              data: {
                slug,
                userId: user.id,
                githubUsername: githubAccount.username
              },
              tags: { type: 'page' }
            })
            return user
          }

          // Check if ID matches the slug (for users without usernames)
          if (user.id === slug) {
            logger.info('findUserBySlug: Found user by ID in batch', {
              data: { slug, userId: user.id },
              tags: { type: 'page' }
            })
            return user
          }
        }

        allUsers = [...allUsers, ...response.data]

        if (response.data.length < limit) break
        offset += limit

        // Add a small delay to avoid rate limiting
        if (offset < maxUsersToSearch && response.data.length === limit) {
          await new Promise(resolve => setTimeout(resolve, 100))
        }
      } catch (error: any) {
        logger.error('Error fetching user batch', {
          data: {
            offset,
            error: error.message || error,
            clerkError: error.clerkError,
            status: error.status
          },
          tags: { type: 'page' }
        })

        // If we have some users, try to find in what we have
        if (allUsers.length > 0) {
          break
        }

        // Otherwise, return null
        return null
      }
    }

    // Final attempt: search in collected users
    const user = allUsers.find(u => {
      // Check if username matches
      if (u.username === slug) return true

      // Check if github username matches in various places
      if (u.publicMetadata?.github_username === slug || u.publicMetadata?.githubUsername === slug)
        return true

      // Check external accounts for GitHub username
      const hasGithubMatch = u.externalAccounts?.find(
        (account: any) => account.provider === 'oauth_github' && account.username === slug
      )
      if (hasGithubMatch) return true

      // Check if generated slug matches (as fallback)
      const userSlug = generateSlugFromUser(u)
      return userSlug === slug
    })

    return user
  } catch (error: any) {
    logger.error('Error finding user:', {
      data: {
        slug,
        error: error.message || error,
        clerkError: error.clerkError
      },
      tags: { type: 'page' }
    })
    return null
  }
}
