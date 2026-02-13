import { logger } from '@thedaviddias/logging'
import { getCachedMembers, type Member } from './member-server-utils'

// Re-export the Member type for consumers that import from here
export type { Member }

export interface GetLatestMembersInput {
  limit?: number
}

/**
 * Get the latest members for homepage display.
 * Reads from the two-tier cache (unstable_cache + Redis) instead of Clerk directly.
 *
 * @param input.limit - Number of members to return (default: 6)
 */
export async function getLatestMembers({
  limit = 6
}: GetLatestMembersInput = {}): Promise<Member[]> {
  try {
    const allMembers = await getCachedMembers()

    // Members are already sorted by -created_at from Clerk, so the first N are the latest
    return allMembers.slice(0, limit)
  } catch (error) {
    logger.error('Error fetching latest members:', {
      data: error instanceof Error ? { message: error.message, name: error.name } : {},
      tags: { type: 'library' }
    })
    return []
  }
}
