import { SearchResults } from '@/components/search/search-results'
import { Breadcrumb } from '@thedaviddias/design-system/breadcrumb'
import { getBaseUrl } from '@thedaviddias/utils/get-base-url'
import type { Metadata } from 'next'
import { Suspense } from 'react'

export const dynamic = 'force-dynamic'

// Generate dynamic metadata based on search params
export async function generateMetadata({
  searchParams
}: { searchParams: { q?: string } }): Promise<Metadata> {
  const { q } = await searchParams

  const query = q || ''

  return {
    title: query ? `Search Results for "${query}" | llms.txt hub` : 'Search | llms.txt hub',
    description: query
      ? `Search results for "${query}" in the llms.txt hub database.`
      : 'Search for AI-ready websites and tools in the llms.txt hub.'
  }
}

export default async function SearchPage({ searchParams }: { searchParams: { q?: string } }) {
  const { q } = await searchParams

  const query = q || ''

  return (
    <div className="max-w-6xl mx-auto px-4 py-8">
      <Breadcrumb items={[{ name: 'Search', href: '/search' }]} baseUrl={getBaseUrl()} />
      <h1 className="text-3xl font-bold mb-6">
        {query ? `Search Results for "${query}"` : 'Search Results'}
      </h1>

      <Suspense
        fallback={
          <div className="flex justify-center py-8">
            <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary-500" />
          </div>
        }
      >
        <SearchResults />
      </Suspense>
    </div>
  )
}
