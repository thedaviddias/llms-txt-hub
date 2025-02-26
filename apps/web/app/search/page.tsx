import { SearchResults } from '@/components/search/search-results'
import { Breadcrumb } from '@thedaviddias/design-system/breadcrumb'
import { getBaseUrl } from '@thedaviddias/utils/get-base-url'
import { Suspense } from 'react'

export default function SearchPage() {
  return (
    <div className="max-w-6xl mx-auto px-4 py-8">
      <Breadcrumb items={[{ name: 'Search', href: '/search' }]} baseUrl={getBaseUrl()} />
      <h1 className="text-3xl font-bold mb-6">Search Results</h1>

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
