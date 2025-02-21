import { LLMGrid } from '@/components/llm/llm-grid'
import type { WebsiteMetadata } from '@/lib/mdx'
import { getRoute } from '@/lib/routes'
import { Button } from '@thedaviddias/design-system/button'
import { ArrowRight, Clock } from 'lucide-react'
import Link from 'next/link'

interface LatestUpdatesSectionProps {
  projects: WebsiteMetadata[]
}

export function LatestUpdatesSection({ projects }: LatestUpdatesSectionProps) {
  return (
    <section className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold flex items-center gap-2">
          <Clock className="h-6 w-6" />
          Latest Updates
        </h2>
        <Button variant="ghost" asChild>
          <Link href={getRoute('project.latest')}>
            View all <ArrowRight className="ml-2 h-4 w-4" />
          </Link>
        </Button>
      </div>
      <LLMGrid items={projects} variant="compact" />
    </section>
  )
}
