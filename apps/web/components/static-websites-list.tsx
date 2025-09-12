import { Section } from '@/components/layout/section'
import type { WebsiteMetadata } from '@/lib/content-loader'
import { WebsitesListWithSearch } from './websites-list-with-search'

interface StaticWebsitesListProps {
  websites: WebsiteMetadata[]
  totalCount?: number
}

/**
 * Wrapper for homepage websites list - passes through to client component with search
 */
export function StaticWebsitesList({ websites, totalCount }: StaticWebsitesListProps) {
  return (
    <Section
      title="All Websites"
      description="Browse the complete directory of websites implementing the llms.txt standard. Click 'Load all' to see the full collection."
    >
      <WebsitesListWithSearch
        initialWebsites={websites}
        totalCount={totalCount}
        emptyTitle="No websites found"
        emptyDescription="There are no websites available. Try checking back later or submit a new website."
      />
    </Section>
  )
}
