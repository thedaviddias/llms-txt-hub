import { ArrowRight } from 'lucide-react'
import Link from 'next/link'
import { LLMGrid } from '@/components/llm/llm-grid'
import type { WebsiteMetadata } from '@/lib/content-loader'
import { getRoute } from '@/lib/routes'

interface FeaturedProjectsSectionProps {
  projects: WebsiteMetadata[]
}

export function FeaturedProjectsSection({ projects }: FeaturedProjectsSectionProps) {
  // Separate primary category tools from personal sites
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
    .slice(0, 4) // Ensure only 4 tools are shown

  const personalProjects = projects
    .filter(project => project.contentType === 'personal')
    .slice(0, 4) // Ensure only 4 personal sites are shown

  return (
    <section className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold">Featured Tools & Platforms</h2>
        <Link href={getRoute('website.featured')} className="flex items-center">
          View all <ArrowRight className="ml-2 size-4" />
        </Link>
      </div>

      {/* Show only 4 tools from primary categories in one row */}
      {toolProjects.length > 0 && <LLMGrid items={toolProjects} />}

      {/* Show personal sites in a smaller, secondary section */}
      {personalProjects.length > 0 && (
        <div className="mt-8 pt-6 border-t">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-lg font-semibold text-muted-foreground">Personal Sites</h3>
            <Link
              href={`${getRoute('website.list')}?contentType=personal`}
              className="flex items-center text-sm text-muted-foreground hover:text-foreground"
            >
              View all personal sites <ArrowRight className="ml-1 size-3" />
            </Link>
          </div>
          <LLMGrid items={personalProjects} />
        </div>
      )}
    </section>
  )
}
