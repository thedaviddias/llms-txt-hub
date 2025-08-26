import { ArrowRight } from 'lucide-react'
import Link from 'next/link'
import { LLMGrid } from '@/components/llm/llm-grid'
import type { WebsiteMetadata } from '@/lib/content-loader'
import { getRoute } from '@/lib/routes'

interface FeaturedProjectsSectionProps {
  projects: WebsiteMetadata[]
}

export function FeaturedProjectsSection({ projects }: FeaturedProjectsSectionProps) {
  // Filter for primary category tools only
  const toolProjects = projects
    .filter(project => {
      // Primary categories
      const primaryCategories = [
        'ai-ml',
        'developer-tools',
        'data-analytics',
        'integration-automation',
        'infrastructure-cloud',
        'security-identity'
      ]
      return primaryCategories.includes(project.category)
    })
    .slice(0, 8) // Show 8 tools (2 rows of 4)

  return (
    <section className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold">Featured Tools & Platforms</h2>
        <Link href={getRoute('website.featured')} className="flex items-center">
          View all <ArrowRight className="ml-2 size-4" />
        </Link>
      </div>

      {/* Show 8 tools from primary categories (2 rows) */}
      {toolProjects.length > 0 && <LLMGrid items={toolProjects} />}
    </section>
  )
}
