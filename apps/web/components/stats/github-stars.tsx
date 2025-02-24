'use client'

import { Github, StarIcon } from 'lucide-react'
import Link from 'next/link'
import { useEffect, useState } from 'react'

type StarsProps = {
  variant?: 'default' | 'small'
}

export const GithubStars = ({ variant = 'default' }: StarsProps) => {
  const [stars, setStars] = useState<number | null>(null)

  useEffect(() => {
    fetch('https://api.github.com/repos/thedaviddias/llms-txt-hub')
      .then(res => res.json())
      .then(data => setStars(data.stargazers_count))
  }, [])

  if (stars === null)
    return (
      <div className="flex items-center justify-center gap-2">
        <span className="inline-flex items-center gap-2 px-4 py-2 bg-white dark:bg-neutral-800 hover:bg-neutral-50 dark:hover:bg-neutral-700 text-sm font-medium text-neutral-900 dark:text-neutral-100 rounded-lg border border-neutral-200 dark:border-neutral-700 transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-neutral-200 dark:focus:ring-neutral-700">
          Loading...
        </span>
      </div>
    )

  return (
    <div className="flex items-center justify-center gap-2">
      <Link
        href="https://github.com/thedaviddias/llms-txt-hub"
        target="_blank"
        className="!no-underline plausible-event-name=Star+Github inline-flex items-center gap-2 px-4 py-2 bg-white dark:bg-neutral-900 hover:bg-neutral-100 dark:hover:bg-neutral-800 text-sm font-medium text-neutral-900 dark:text-neutral-100 rounded-lg border border-neutral-400 dark:border-neutral-700 transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-neutral-200 dark:focus:ring-neutral-700"
        aria-label="Star on GitHub"
      >
        <Github className="w-4 h-4" aria-hidden="true" />
        {variant === 'default' && <span className="hidden lg:inline">Star on GitHub</span>}
        <span className="inline-flex items-center px-2 py-1 rounded bg-neutral-100 dark:bg-neutral-700 text-neutral-900 dark:text-neutral-100">
          <StarIcon className="w-4 h-4 mr-1" aria-hidden="true" />
          {stars}
        </span>
      </Link>
    </div>
  )
}
