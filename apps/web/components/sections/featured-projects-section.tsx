import { LLMGrid } from '@/components/llm/llm-grid'
import type { WebsiteMetadata } from '@/lib/mdx'
import { getRoute } from '@/lib/routes'
import { Button } from '@thedaviddias/design-system/button'
import { ArrowRight } from 'lucide-react'
import Link from 'next/link'

interface FeaturedProjectsSectionProps {
  projects: WebsiteMetadata[]
}

export function FeaturedProjectsSection({ projects }: FeaturedProjectsSectionProps) {
  return (
    <section className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-3xl font-bold">Featured Projects</h2>
        <Button variant="ghost" asChild>
          <Link href={getRoute('project.featured')}>
            View all <ArrowRight className="ml-2 h-4 w-4" />
          </Link>
        </Button>
      </div>
      <LLMGrid items={projects} />
    </section>
  )
}
