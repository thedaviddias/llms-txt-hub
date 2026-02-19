'use client'

import { logger } from '@thedaviddias/logging'
import { useCallback, useEffect, useState } from 'react'

interface UserContributionStatus {
  username: string
  hasContributions: boolean
  error?: string
}

interface ContributionsMap {
  [username: string]: boolean | undefined
}

interface UseContributionsProps {
  usernames: string[]
  enabled?: boolean
}

interface UseContributionsReturn {
  contributions: ContributionsMap
  isLoading: boolean
  error: string | null
  refetch: () => Promise<void>
}

/**
 * Fetch and cache GitHub contribution counts for the given usernames
 */
export function useContributions({
  usernames,
  enabled = true
}: UseContributionsProps): UseContributionsReturn {
  const [contributions, setContributions] = useState<ContributionsMap>({})
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Filter valid usernames
  const validUsernames = usernames.filter(
    username => typeof username === 'string' && username.trim().length > 0
  )

  const fetchContributions = useCallback(
    async (options: { force?: boolean } = {}) => {
      const { force = false } = options

      if (!enabled || validUsernames.length === 0) return

      // Skip if we already have all contributions data
      const missingUsernames = force
        ? validUsernames
        : validUsernames.filter(username => contributions[username] === undefined)

      if (missingUsernames.length === 0) return

      setIsLoading(true)
      setError(null)

      try {
        const response = await fetch('/api/members/contributions', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            usernames: missingUsernames
          })
        })

        if (!response.ok) {
          throw new Error(`Failed to fetch contributions: ${response.statusText}`)
        }

        const data = await response.json()

        if (data.error) {
          throw new Error(data.error)
        }

        // Update contributions map
        setContributions(prev => {
          const updated = { ...prev }
          data.contributions.forEach((contrib: UserContributionStatus) => {
            updated[contrib.username] = contrib.hasContributions
          })
          return updated
        })
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Failed to fetch contributions'
        setError(errorMessage)
        logger.error(err instanceof Error ? err : new Error(String(err)), {
          data: err,
          tags: { type: 'hook', hook: 'use-contributions' }
        })
      } finally {
        setIsLoading(false)
      }
    },
    [validUsernames, contributions, enabled]
  )

  const refetch = useCallback(async () => {
    await fetchContributions({ force: true })
  }, [fetchContributions])

  // Debounced effect to fetch contributions when usernames change
  useEffect(() => {
    if (!enabled || validUsernames.length === 0) return

    const timeoutId = setTimeout(() => {
      fetchContributions()
    }, 150) // Small delay to batch rapid changes

    return () => clearTimeout(timeoutId)
  }, [fetchContributions, validUsernames.join(','), enabled])

  return {
    contributions,
    isLoading,
    error,
    refetch
  }
}
