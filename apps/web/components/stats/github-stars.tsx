'use client'

import { SiGithub } from '@icons-pack/react-simple-icons'
import { StarIcon } from 'lucide-react'
import Link from 'next/link'
import { useEffect, useState } from 'react'

type StarsProps = {
  variant?: 'default' | 'small'
  mobileCompact?: boolean
}

export const GithubStars = ({ variant = 'default', mobileCompact = false }: StarsProps) => {
  const [stars, setStars] = useState<number | null>(null)

  useEffect(() => {
    fetch('https://api.github.com/repos/thedaviddias/llms-txt-hub')
      .then(res => res.json())
      .then(data => setStars(data.stargazers_count))
  }, [])

  if (stars === null) {
    if (mobileCompact) {
      return (
        <div className="inline-flex items-center gap-1 py-1.5 px-2 text-sm font-medium text-muted-foreground sm:gap-1.5 sm:px-3 sm:py-1.5 sm:bg-white dark:sm:bg-neutral-900 sm:text-neutral-900 dark:sm:text-neutral-100 sm:rounded-lg sm:border sm:border-neutral-400 dark:sm:border-neutral-700 opacity-70">
          <SiGithub className="w-4 h-4 hidden sm:block" aria-hidden="true" />
          <span className="sm:inline-flex sm:items-center sm:px-1.5 sm:py-0.5 sm:rounded sm:bg-neutral-100 dark:sm:bg-neutral-700 sm:text-neutral-900 dark:sm:text-neutral-100 inline-flex items-center gap-0.5">
            <StarIcon className="w-4 h-4" aria-hidden="true" />
            <span className="w-6 h-4 bg-neutral-300 dark:bg-neutral-600 rounded animate-pulse" />
          </span>
        </div>
      )
    }

    return (
      <div className="flex items-center justify-center gap-2">
        <div className="inline-flex items-center gap-2 px-2 py-1 bg-white dark:bg-neutral-900 text-sm font-medium text-neutral-900 dark:text-neutral-100 rounded-lg border border-neutral-400 dark:border-neutral-700 opacity-70">
          <SiGithub className="w-4 h-4" aria-hidden="true" />
          <span className="inline-flex items-center px-2 py-0.5 rounded bg-neutral-100 dark:bg-neutral-700 text-neutral-900 dark:text-neutral-100">
            <StarIcon className="w-4 h-4 mr-1" aria-hidden="true" />
            <span className="w-8 h-4 bg-neutral-300 dark:bg-neutral-600 rounded animate-pulse" />
          </span>
        </div>
      </div>
    )
  }

  if (mobileCompact) {
    return (
      <Link
        href="https://github.com/thedaviddias/llms-txt-hub"
        target="_blank"
        rel="noopener noreferrer"
        className="!no-underline plausible-event-name=Star+GitHub inline-flex items-center gap-1 py-1.5 px-2 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors sm:gap-1.5 sm:px-3 sm:py-1.5 sm:bg-white dark:sm:bg-neutral-900 sm:hover:bg-neutral-100 dark:sm:hover:bg-neutral-800 sm:text-neutral-900 dark:sm:text-neutral-100 sm:rounded-lg sm:border sm:border-neutral-400 dark:sm:border-neutral-700 sm:focus:outline-none sm:focus:ring-2 sm:focus:ring-offset-2 sm:focus:ring-neutral-200 dark:sm:focus:ring-neutral-700"
        aria-label="Star on GitHub"
      >
        <SiGithub className="w-4 h-4 hidden sm:block" aria-hidden="true" />
        <span className="sm:inline-flex sm:items-center sm:px-1.5 sm:py-0.5 sm:rounded sm:bg-neutral-100 dark:sm:bg-neutral-700 sm:text-neutral-900 dark:sm:text-neutral-100 inline-flex items-center gap-0.5">
          <StarIcon className="w-4 h-4" aria-hidden="true" />
          <span className="text-xs sm:text-sm">{stars}</span>
        </span>
      </Link>
    )
  }

  return (
    <div className="flex items-center justify-center gap-2">
      <Link
        href="https://github.com/thedaviddias/llms-txt-hub"
        target="_blank"
        rel="noopener noreferrer"
        className="!no-underline plausible-event-name=Star+GitHub inline-flex items-center gap-2 px-2 py-1 bg-white dark:bg-neutral-900 hover:bg-neutral-100 dark:hover:bg-neutral-800 text-sm font-medium text-neutral-900 dark:text-neutral-100 rounded-lg border border-neutral-400 dark:border-neutral-700 transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-neutral-200 dark:focus:ring-neutral-700"
        aria-label="Star on GitHub"
      >
        <SiGithub className="w-4 h-4" aria-hidden="true" />
        <span className="inline-flex items-center px-2 py-0.5 rounded bg-neutral-100 dark:bg-neutral-700 text-neutral-900 dark:text-neutral-100">
          <StarIcon className="w-4 h-4 mr-1" aria-hidden="true" />
          {stars}
        </span>
      </Link>
    </div>
  )
}
