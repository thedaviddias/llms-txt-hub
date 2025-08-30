'use client'

import type { WebsiteMetadata } from '@/lib/content-loader'
import { logger } from '@thedaviddias/logging'
import { useEffect, useState } from 'react'

/**
 * React hook that fetches website metadata from the client API and exposes loading/error state.
 *
 * On mount this hook requests '/api/websites' and keeps internal state for the retrieved
 * WebsiteMetadata array, a loading flag, and any error message.
 *
 * @returns An object with:
 *  - `websites`: the fetched WebsiteMetadata[] (empty until data loads),
 *  - `isLoading`: true while the request is in progress,
 *  - `error`: an error message string or null if the last fetch succeeded.
 */
export function useWebsites() {
  const [websites, setWebsites] = useState<WebsiteMetadata[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    async function fetchWebsites() {
      try {
        setIsLoading(true)
        const response = await fetch('/api/websites')
        if (!response.ok) {
          throw new Error('Failed to fetch websites')
        }
        const data = await response.json()
        setWebsites(data)
        setError(null)
      } catch (err) {
        logger.error('Error fetching websites:', { data: err, tags: { type: 'hook' } })
        setError(err instanceof Error ? err.message : 'Failed to fetch websites')
      } finally {
        setIsLoading(false)
      }
    }

    fetchWebsites()
  }, [])

  return {
    websites,
    isLoading,
    error
  }
}
