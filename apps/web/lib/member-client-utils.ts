/**
 * Client-safe member utilities that don't depend on server-side modules
 */

export interface MemberBadge {
  type: 'contributor' | 'community' | 'supporter'
  label: string
  variant: 'default' | 'secondary' | 'outline'
}

/**
 * Synchronously determines member badge based on contribution status
 * @param hasContributions - Whether the user has made contributions
 * @returns MemberBadge configuration
 */
export function getMemberBadgeSync(hasContributions?: boolean): MemberBadge {
  if (hasContributions) {
    return {
      type: 'contributor',
      label: 'Contributor',
      variant: 'default'
    }
  }

  return {
    type: 'community',
    label: 'Community',
    variant: 'secondary'
  }
}
