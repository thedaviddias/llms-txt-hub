import { Section } from '@/components/layout/section'
import { LLMGrid } from '@/components/llm/llm-grid'
import type { WebsiteMetadata } from '@/lib/content-loader'
import { getRoute } from '@/lib/routes'

interface WebsiteRelatedProjectsProps {
  websites: WebsiteMetadata[]
}

/**
 * Related projects section for website detail pages
 *
 * @param props - Component props
 * @param props.websites - Array of related website metadata
 * @returns Related projects grid section
 */
export function WebsiteRelatedProjects({ websites }: WebsiteRelatedProjectsProps) {
  if (websites.length === 0) return null

  return (
    <section className="animate-fade-in-up opacity-0 stagger-7">
      <Section
        title="Related Projects"
        description="Discover similar websites implementing llms.txt"
        viewAllHref={getRoute('website.list')}
        viewAllText="Browse all websites"
        titleId="related-projects"
      >
        <LLMGrid
          items={websites.slice(0, 3)}
          analyticsSource="related-projects"
          className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4"
          overrideGrid={true}
          animateIn={false}
        />
      </Section>
    </section>
  )
}
