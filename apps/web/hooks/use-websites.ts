'use client'

import type { WebsiteMetadata } from '@/lib/content-loader'
import { logger } from '@thedaviddias/logging'
import { useEffect, useState } from 'react'

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
