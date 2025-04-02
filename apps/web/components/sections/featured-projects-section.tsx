import { LLMGrid } from '@/components/llm/llm-grid'
import type { WebsiteMetadata } from '@/lib/content-loader'
import { getRoute } from '@/lib/routes'
import { ArrowRight } from 'lucide-react'
import Link from 'next/link'

interface FeaturedProjectsSectionProps {
  projects: WebsiteMetadata[]
}

export function FeaturedProjectsSection({ projects }: FeaturedProjectsSectionProps) {
  return (
    <section className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold">Featured Websites</h2>
        <Link href={getRoute('website.featured')} className="flex items-center">
          View all <ArrowRight className="ml-2 size-4" />
        </Link>
      </div>
      <LLMGrid items={projects} />
    </section>
  )
}
