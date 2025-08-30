'use client'

import { StatCard } from '@/components/stats/stat-card'
import { logger } from '@thedaviddias/logging'
import { Star } from 'lucide-react'
import { useEffect, useState } from 'react'

/**
 * A client component that displays GitHub stars count in a stat card
 *
 * @returns React component displaying GitHub stars
 *
 * @example
 * ```tsx
 * <GitHubStarsCard />
 * ```
 */
export function GitHubStarsCard() {
  const [stars, setStars] = useState<number | null>(null)

  useEffect(() => {
    fetch('https://api.github.com/repos/thedaviddias/llms-txt-hub')
      .then(res => {
        if (!res.ok) {
          throw new Error('Failed to fetch GitHub stars')
        }
        return res.json()
      })
      .then(data => setStars(data.stargazers_count))
      .catch(error => {
        logger.error('Error fetching GitHub stars:', { data: error, tags: { type: 'component' } })
        setStars(0)
      })
  }, [])

  return (
    <StatCard
      title="GitHub Stars"
      value={stars ?? '...'}
      icon={Star}
      description="Show your support by starring us on GitHub!"
    />
  )
}
