'use client'

import { Download } from 'lucide-react'
import { useEffect, useState } from 'react'

/**
 * Format a number with k suffix for thousands (e.g. 1500 → 1.5k)
 */
function formatCount(count: number): string {
  if (count >= 1000) {
    return `${(count / 1000).toFixed(1).replace(/\.0$/, '')}k`
  }
  return count.toString()
}

interface CliInstallCountProps {
  cliSlug: string
}

/**
 * Displays the CLI install count for a skill, fetched from telemetry.
 * Renders nothing while loading, if count is 0, or on error.
 */
export function CliInstallCount({ cliSlug }: CliInstallCountProps) {
  const [count, setCount] = useState<number | null>(null)

  useEffect(() => {
    let cancelled = false

    fetch(`/api/cli/stats/${encodeURIComponent(cliSlug)}`)
      .then(res => (res.ok ? res.json() : null))
      .then(data => {
        if (!cancelled && data?.count) {
          setCount(data.count)
        }
      })
      .catch(() => {})

    return () => {
      cancelled = true
    }
  }, [cliSlug])

  if (!count) return null

  return (
    <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
      <Download className="size-3" aria-hidden />
      {formatCount(count)} installs
    </span>
  )
}
