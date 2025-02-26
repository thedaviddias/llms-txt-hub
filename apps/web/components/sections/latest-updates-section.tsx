import { LLMGrid } from '@/components/llm/llm-grid'
import type { WebsiteMetadata } from '@/lib/mdx'
import { getRoute } from '@/lib/routes'
import { ArrowRight, Rss } from 'lucide-react'
import Link from 'next/link'

interface LatestUpdatesSectionProps {
  projects: WebsiteMetadata[]
}

export function LatestUpdatesSection({ projects }: LatestUpdatesSectionProps) {
  return (
    <section className="space-y-6">
      <div className="flex justify-between items-center">
        <div className="flex items-center gap-2">
          <h2 className="text-2xl font-bold flex items-center gap-2">Latest Updates</h2>
          <Link
            href={getRoute('rss')}
            className="text-sm text-muted-foreground hover:text-foreground"
          >
            <Rss className="h-4 w-4" />
            <span className="sr-only">RSS Feed for latest updates</span>
          </Link>
        </div>
        <Link href={getRoute('website.latest')} className="flex items-center">
          View all <ArrowRight className="ml-2 h-4 w-4" />
        </Link>
      </div>
      <LLMGrid items={projects} variant="compact" />
    </section>
  )
}
