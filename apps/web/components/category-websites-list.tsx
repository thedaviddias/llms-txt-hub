import type { WebsiteMetadata } from '@/lib/content-loader'
import { WebsitesListWithSort } from './websites-list-with-sort'

interface CategoryWebsitesListProps {
  initialWebsites: WebsiteMetadata[]
  categoryType?: 'tool' | 'non-tool'
}

/**
 * Wrapper for category websites list - passes through to client component
 */
export function CategoryWebsitesList({
  initialWebsites,
  categoryType = 'non-tool'
}: CategoryWebsitesListProps) {
  return (
    <WebsitesListWithSort
      initialWebsites={initialWebsites}
      emptyTitle="No websites found"
      emptyDescription="There are no websites in this category yet. Try checking back later or submit a new website."
      categoryType={categoryType}
    />
  )
}
