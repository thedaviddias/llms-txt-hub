import { Section } from '@/components/layout/section'
import { getRoute } from '@/lib/routes'
import type { Guide } from '@/types/types'
import { GuideCard } from './guide-card'

interface FeaturedGuidesSectionProps {
  guides: Guide[]
}

/**
 * Section component displaying featured guides
 *
 * @param props - Component props
 * @param props.guides - List of guides to display
 * @returns React component
 */
export function FeaturedGuidesSection({ guides }: FeaturedGuidesSectionProps) {
  return (
    <Section
      title="Featured Guides"
      description="Learn how to implement and optimize llms.txt for your documentation"
      viewAllHref={getRoute('guides.list')}
      viewAllText="All guides"
    >
      <div className="grid gap-4 sm:gap-6 sm:grid-cols-2 lg:grid-cols-4 3xl:grid-cols-5 4xl:grid-cols-6">
        {guides.map(guide => (
          <GuideCard key={guide.slug} guide={guide} />
        ))}
      </div>
    </Section>
  )
}
