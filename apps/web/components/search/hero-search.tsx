'use client'

import { useSearch } from '@/hooks/use-search'
import { logger } from '@thedaviddias/logging'
import { Loader2, Search } from 'lucide-react'
import { useState } from 'react'

/**
 * A search input component for the hero section that triggers a site search.
 *
 * Renders a text input bound to the `useSearch` hook and a submit button. On submit, if the
 * query is non-empty it sets a local loading state, calls `handleSearch(searchQuery)` and
 * restores the loading state when complete. Errors during the search are logged; the input
 * value is not cleared here (the search page handles that).
 *
 * @returns The rendered search form as a JSX element.
 */
export function HeroSearch() {
  const { searchQuery, setSearchQuery, handleSearch } = useSearch()
  const [isLoading, setIsLoading] = useState(false)

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (searchQuery.trim()) {
      setIsLoading(true)
      try {
        await handleSearch(searchQuery)
        // Don't clear the query immediately - it will be handled by the search page
      } catch (error) {
        logger.error('Search error:', { data: error, tags: { type: 'component' } })
      } finally {
        setIsLoading(false)
      }
    }
  }

  return (
    <form onSubmit={onSubmit} className="max-w-2xl mx-auto w-full">
      <div className="relative">
        <input
          type="text"
          placeholder="Find AI-ready documentation and tools..."
          value={searchQuery}
          onChange={e => setSearchQuery(e.target.value)}
          className="w-full rounded-lg border border-input bg-background px-4 py-3 text-base ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 shadow-sm"
          disabled={isLoading}
        />
        <button
          type="submit"
          className="absolute inset-y-0 right-0 flex items-center px-4 text-muted-foreground hover:text-foreground"
          aria-label="Search"
          disabled={isLoading}
        >
          {isLoading ? (
            <Loader2 className="h-5 w-5 animate-spin" />
          ) : (
            <Search className="h-5 w-5" />
          )}
        </button>
      </div>
    </form>
  )
}
