'use client'

import { EmptyState } from '@/components/empty-state'
import { SearchFilters } from '@/components/search/search-filters'
import { useSearch } from '@/components/search/use-search'
import { WebsitesListWithSort } from '@/components/websites-list-with-sort'
import { getRoute } from '@/lib/routes'
import { useSearchParams } from 'next/navigation'
import { useEffect, useMemo, useState } from 'react'

/**
 * Search results component for displaying and filtering websites
 *
 * @returns React component
 */
export function SearchResults() {
  const searchParams = useSearchParams()
  const query = searchParams.get('q') || ''
  const { results, loading, error } = useSearch(query)
  const [selectedCategories, setSelectedCategories] = useState<string[]>([])

  // Filter results based on selected categories
  const filteredResults = useMemo(() => {
    if (selectedCategories.length === 0) {
      return results
    }
    return results.filter(result => selectedCategories.includes(result.category))
  }, [results, selectedCategories])

  // Get available categories from current results
  const availableCategories = useMemo(() => {
    return [...new Set(results.map(result => result.category))]
  }, [results])

  useEffect(() => {
    if (query) {
      document.title = `Search Results for "${query}" | llms.txt hub`
    } else {
      document.title = 'Search | llms.txt hub'
    }
  }, [query])

  if (error) {
    return (
      <div className="border border-red-200 bg-red-50 dark:bg-red-900/20 dark:border-red-800 p-4 rounded-md">
        <h2 className="text-lg font-semibold text-red-800 dark:text-red-400">
          Something went wrong
        </h2>
        <p className="text-red-700 dark:text-red-300 mt-1">{error}</p>
        <button
          type="button"
          onClick={() => window.location.reload()}
          className="mt-3 px-4 py-2 bg-red-100 dark:bg-red-800 text-red-800 dark:text-red-200 rounded-md hover:bg-red-200 dark:hover:bg-red-700 transition-colors"
        >
          Refresh Page
        </button>
      </div>
    )
  }

  if (loading) {
    return (
      <div className="flex justify-center py-8">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary-500" />
      </div>
    )
  }

  if (!query) {
    return (
      <EmptyState
        title="Start Your Search"
        description="Type something in the search bar above to find AI documentation and tools."
        actionLabel="Explore All Projects"
        actionHref={getRoute('home')}
      />
    )
  }

  if (results.length === 0) {
    return (
      <div className="space-y-6">
        <div className="text-center py-8">
          <h2 className="text-xl font-semibold mb-2">Nothing Found</h2>
          <p className="text-muted-foreground mb-6">
            We couldn't find any results for "{query}". Try using different keywords or check your
            spelling.
          </p>
          <div className="space-y-2 text-sm text-muted-foreground">
            <p>Search suggestions:</p>
            <ul className="list-disc list-inside space-y-1 max-w-md mx-auto">
              <li>Check for typos in your search terms</li>
              <li>Try more general keywords (e.g., "AI" instead of "artificial intelligence")</li>
              <li>Browse by category using the sidebar</li>
              <li>Submit your own llms.txt if you have one</li>
            </ul>
          </div>
        </div>
        <EmptyState
          title="Add Your your llms.txt"
          description="Don't see your project listed? Submit your llms.txt to be included in the directory."
          actionLabel="Add Your your llms.txt"
          actionHref={getRoute('submit')}
        />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Results Summary and Filters */}
      <div className="space-y-4">
        <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-4">
          <div>
            <h2 className="text-lg font-semibold">
              {filteredResults.length} result{filteredResults.length !== 1 ? 's' : ''} for "{query}"
            </h2>
            <p className="text-sm text-muted-foreground">
              {selectedCategories.length > 0 ? (
                <>
                  Filtered by {selectedCategories.length} categor
                  {selectedCategories.length !== 1 ? 'ies' : 'y'}
                  {results.length !== filteredResults.length && (
                    <> • {results.length} total results</>
                  )}
                </>
              ) : (
                <>
                  Found in {availableCategories.length} categor
                  {availableCategories.length !== 1 ? 'ies' : 'y'}
                </>
              )}
            </p>
          </div>

          <SearchFilters
            selectedCategories={selectedCategories}
            onCategoryChange={setSelectedCategories}
            availableCategories={availableCategories}
            resultCount={results.length}
          />
        </div>
      </div>

      {/* Category Breakdown for unfiltered results */}
      {results.length > 3 && selectedCategories.length === 0 && (
        <div className="border rounded-lg p-4 bg-muted/20">
          <h3 className="text-sm font-semibold mb-3">Results by category:</h3>
          <div className="flex flex-wrap gap-2">
            {Object.entries(
              results.reduce<Record<string, number>>((acc, result) => {
                acc[result.category] = (acc[result.category] || 0) + 1
                return acc
              }, {})
            ).map(([category, count]) => (
              <button
                key={category}
                type="button"
                onClick={() => setSelectedCategories([category])}
                className="inline-flex items-center px-3 py-1 rounded-full text-xs bg-background border hover:bg-muted/50 transition-colors cursor-pointer"
              >
                {category} ({count})
              </button>
            ))}
          </div>
        </div>
      )}

      {/* No results after filtering */}
      {filteredResults.length === 0 && selectedCategories.length > 0 ? (
        <div className="text-center py-8">
          <h3 className="text-lg font-semibold mb-2">No results match your filters</h3>
          <p className="text-muted-foreground mb-4">
            Try removing some category filters or search with different terms.
          </p>
          <button
            type="button"
            onClick={() => setSelectedCategories([])}
            className="text-primary hover:text-primary/80 text-sm font-medium"
          >
            Clear all filters
          </button>
        </div>
      ) : (
        /* Results */
        <WebsitesListWithSort
          initialWebsites={filteredResults}
          emptyTitle="No results found"
          emptyDescription={`We couldn't find any results for "${query}". Try using different keywords or check your spelling.`}
        />
      )}
    </div>
  )
}
