import { Section } from '@/components/layout/section'
import { LLMGrid } from '@/components/llm/llm-grid'
import type { WebsiteMetadata } from '@/lib/content-loader'
import { getRoute } from '@/lib/routes'

interface FeaturedProjectsSectionProps {
  projects: WebsiteMetadata[]
}

export function FeaturedProjectsSection({ projects }: FeaturedProjectsSectionProps) {
  // Projects are already filtered and limited to 6 featured items
  return (
    <Section
      title="Featured Tools & Platforms"
      description="Discover the most popular AI-ready websites and development tools"
      viewAllHref={getRoute('category.page', { category: 'featured' })}
      viewAllText="All featured"
    >
      {/* Show featured projects (max 6) */}
      {projects.length > 0 && <LLMGrid items={projects} />}
    </Section>
  )
}
