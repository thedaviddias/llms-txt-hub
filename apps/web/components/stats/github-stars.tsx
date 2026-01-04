'use client'

import { SiGithub } from '@icons-pack/react-simple-icons'
import { StarIcon } from 'lucide-react'
import Link from 'next/link'
import { useEffect, useState } from 'react'

interface StarsProps {
  mobileCompact?: boolean
}

/**
 * GitHub stars badge component with minimal bold styling
 * Features: Square corners, bold typography, hover effects
 *
 * @param props - Component props
 * @param props.mobileCompact - Whether to show compact version on mobile
 * @returns GitHub stars badge link component
 */
export function GithubStars({ mobileCompact = false }: StarsProps) {
  const [stars, setStars] = useState<number | null>(null)

  useEffect(() => {
    const controller = new AbortController()

    fetch('https://api.github.com/repos/thedaviddias/llms-txt-hub', {
      signal: controller.signal
    })
      .then(res => {
        if (!res.ok) {
          // Rate limited or other error - fail silently
          return null
        }
        return res.json()
      })
      .then(data => {
        if (data?.stargazers_count) {
          setStars(data.stargazers_count)
        }
      })
      .catch(error => {
        // Ignore abort errors - component was unmounted
        if (error.name === 'AbortError') {
          return
        }
        // Silently fail for other errors - component will just show without count
      })

    return () => {
      controller.abort()
    }
  }, [])

  // Mobile compact variant
  if (mobileCompact) {
    return (
      <Link
        href="https://github.com/thedaviddias/llms-txt-hub"
        target="_blank"
        rel="noopener noreferrer"
        className="!no-underline plausible-event-name=Star+GitHub inline-flex items-center gap-2 h-9 px-3 text-sm font-bold text-muted-foreground hover:text-foreground sm:bg-secondary hover:sm:bg-accent sm:text-foreground sm:rounded-none sm:border sm:border-border hover:sm:border-foreground/20 transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        aria-label="Star on GitHub"
      >
        <SiGithub className="size-4" aria-hidden="true" />
        <StarIcon className="size-3.5" aria-hidden="true" />
        {stars !== null && <span className="tabular-nums">{stars}</span>}
      </Link>
    )
  }

  // Default variant
  return (
    <div className="flex items-center justify-center">
      <Link
        href="https://github.com/thedaviddias/llms-txt-hub"
        target="_blank"
        rel="noopener noreferrer"
        className="!no-underline plausible-event-name=Star+GitHub inline-flex items-center gap-2 h-9 px-3 bg-secondary hover:bg-accent text-sm font-bold text-foreground rounded-none border border-border hover:border-foreground/20 transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        aria-label="Star on GitHub"
      >
        <SiGithub className="size-4" aria-hidden="true" />
        <StarIcon className="size-3.5" aria-hidden="true" />
        {stars !== null && <span className="tabular-nums">{stars}</span>}
      </Link>
    </div>
  )
}
