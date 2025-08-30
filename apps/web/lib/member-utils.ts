import { getUserContributions } from './github-contributions'

export interface MemberBadge {
  type: 'contributor' | 'community'
  label: string
  variant: 'default' | 'secondary' | 'outline'
}

/**
 * Determines the appropriate badge for a member based on their contributions
 * @param username - GitHub username to check contributions for
 * @returns Promise resolving to MemberBadge configuration
 */
export async function getMemberBadge(username?: string | null): Promise<MemberBadge> {
  if (!username) {
    return {
      type: 'community',
      label: 'Community',
      variant: 'outline'
    }
  }

  try {
    const contributions = await getUserContributions(username)

    if (contributions.total > 0) {
      return {
        type: 'contributor',
        label: 'Contributor',
        variant: 'default'
      }
    }

    return {
      type: 'community',
      label: 'Community',
      variant: 'outline'
    }
  } catch {
    // If we can't fetch contributions, default to community member
    return {
      type: 'community',
      label: 'Community',
      variant: 'outline'
    }
  }
}

// getMemberBadgeSync has been moved to member-client-utils.ts for client-side use
