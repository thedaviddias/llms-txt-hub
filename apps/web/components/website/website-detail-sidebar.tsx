import registryData from '@cli-data/registry.json'
import { Calendar, Download, Hash } from 'lucide-react'
import Link from 'next/link'
import type { WebsiteMetadata } from '@/lib/content-loader'
import { getRawClient } from '@/lib/redis'
import { getRoute } from '@/lib/routes'

// Build lookup: webSlug -> CLI slug (runs once at module load / build time)
const webSlugToCliSlug = new Map<string, string>()
for (const entry of registryData as { slug: string; webSlug?: string }[]) {
  if (entry.webSlug) {
    webSlugToCliSlug.set(entry.webSlug, entry.slug)
  }
}

/**
 * Format a number with K suffix for thousands (e.g. 1500 → 1.5K)
 */
function formatCount(count: number): string {
  if (count >= 1000) {
    return `${(count / 1000).toFixed(1).replace(/\.0$/, '')}K`
  }
  return count.toString()
}

interface WebsiteDetailSidebarProps {
  website: WebsiteMetadata
}

/**
 * Sidebar for website detail pages showing stats, metadata, and per-agent installs.
 * Server component — reads install data from Redis at SSR time.
 */
export async function WebsiteDetailSidebar({ website }: WebsiteDetailSidebarProps) {
  const cliSlug = webSlugToCliSlug.get(website.slug)

  let installRuns = 0
  let agentPlacements = 0
  let agentInstalls: { name: string; count: number }[] = []

  if (cliSlug) {
    try {
      const redis = getRawClient()
      if (redis) {
        const [totalCount, agentData] = await Promise.all([
          redis.hget<number>('telemetry:v2:skills:installs', cliSlug),
          redis.hgetall<Record<string, number>>(`telemetry:v2:skills:agents:${cliSlug}`)
        ])
        installRuns = totalCount ?? 0

        if (agentData) {
          const installs = Object.entries(agentData).map(([name, count]) => ({
            name,
            count: Number(count)
          }))
          agentPlacements = installs.reduce((total, install) => total + install.count, 0)
          agentInstalls = installs.sort((a, b) => b.count - a.count).slice(0, 8)
        }
      }
    } catch {
      // Redis unavailable — show empty
    }
  }

  return (
    <aside className="space-y-6 lg:sticky lg:top-20 lg:self-start">
      <div className="rounded-2xl border border-border/50 bg-card/50 backdrop-blur-sm p-6 space-y-6">
        {/* Install count */}
        {cliSlug && installRuns > 0 && (
          <div>
            <span className="text-xs font-mono uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
              <Download className="size-3" aria-hidden />
              Install runs
            </span>
            <p className="text-3xl font-semibold font-mono tracking-tight mt-1">
              {formatCount(installRuns)}
            </p>
          </div>
        )}

        {cliSlug && agentPlacements > 0 && (
          <div>
            <span className="text-xs font-mono uppercase tracking-wider text-muted-foreground">
              Agent placements
            </span>
            <p className="text-3xl font-semibold font-mono tracking-tight mt-1">
              {formatCount(agentPlacements)}
            </p>
            <p className="mt-1 text-xs text-muted-foreground">
              One run can install into multiple agents.
            </p>
          </div>
        )}

        {/* Category */}
        {website.category && (
          <div>
            <span className="text-xs font-mono uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
              <Hash className="size-3" aria-hidden />
              Category
            </span>
            <Link
              href={getRoute('category.page', { category: website.category })}
              className="mt-1 inline-block text-sm text-foreground hover:text-primary transition-colors capitalize"
            >
              {website.category.replace(/-/g, ' ')}
            </Link>
          </div>
        )}

        {/* Added date */}
        {website.publishedAt && (
          <div>
            <span className="text-xs font-mono uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
              <Calendar className="size-3" aria-hidden />
              Added
            </span>
            <p className="text-sm text-foreground mt-1">
              {new Date(website.publishedAt).toLocaleDateString('en-US', {
                month: 'long',
                day: 'numeric',
                year: 'numeric'
              })}
            </p>
          </div>
        )}

        {/* Installed into — per-agent breakdown */}
        {cliSlug && agentInstalls.length > 0 && (
          <div>
            <span className="text-xs font-mono uppercase tracking-wider text-muted-foreground mb-3 block">
              Installed into
            </span>
            <div className="divide-y divide-border/50">
              {agentInstalls.map(({ name, count }) => (
                <div
                  key={name}
                  className="flex items-center justify-between py-2 first:pt-0 last:pb-0"
                >
                  <span className="text-sm text-foreground">{name}</span>
                  <span className="text-sm font-mono text-muted-foreground tabular-nums">
                    {formatCount(count)}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </aside>
  )
}
