'use client'

import { useState } from 'react'
import LlmsTxtViewer from './llmstxt-viewer'

type LlmsData = {
  url: string
  name: string
  content: string
  type: 'llms.txt' | 'llms-full.txt'
  category?: string
  lastFetched: string
}

export default function SearchInterface() {
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<LlmsData[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [activeFilter, setActiveFilter] = useState<string | null>(null)

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!query.trim()) return

    setIsLoading(true)
    try {
      const response = await fetch(`/api/search?q=${encodeURIComponent(query)}`)
      const data = await response.json()
      setResults(data.results)
      setActiveFilter(null)
    } catch (error) {
      console.error('Search failed:', error)
    } finally {
      setIsLoading(false)
    }
  }

  // Get unique categories for filter
  const categories = [...new Set(results.map(item => item.category).filter(Boolean))] as string[]

  // Apply category filter
  const filteredResults = activeFilter
    ? results.filter(item => item.category === activeFilter)
    : results

  // Group by website
  const resultsByWebsite = filteredResults.reduce(
    (acc, item) => {
      const key = item.name
      if (!acc[key]) {
        acc[key] = []
      }
      acc[key].push(item)
      return acc
    },
    {} as Record<string, LlmsData[]>
  )

  return (
    <div>
      <form onSubmit={handleSearch} className="max-w-3xl mx-auto mb-8">
        <div className="relative rounded-lg shadow-sm">
          <input
            type="text"
            value={query}
            onChange={e => setQuery(e.target.value)}
            className="block w-full rounded-lg border border-neutral-300 bg-neutral-50 p-4 pl-4 pr-16 text-neutral-900 focus:border-neutral-500 focus:ring-neutral-500 dark:border-neutral-600 dark:bg-neutral-700 dark:text-white dark:placeholder-neutral-400 dark:focus:border-neutral-500 dark:focus:ring-neutral-500"
            placeholder="Search llms.txt files (e.g. 'context window', 'models', 'api')"
          />
          <button
            type="submit"
            className="absolute right-2.5 bottom-2.5 rounded-lg bg-neutral-700 px-4 py-2 text-sm font-medium text-white hover:bg-neutral-800 focus:outline-none focus:ring-4 focus:ring-neutral-300 dark:bg-neutral-600 dark:hover:bg-neutral-700 dark:focus:ring-neutral-800"
            disabled={isLoading}
          >
            {isLoading ? 'Searching...' : 'Search'}
          </button>
        </div>
      </form>

      {isLoading ? (
        <div className="flex justify-center my-8">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-neutral-500" />
        </div>
      ) : results.length > 0 ? (
        <div className="space-y-6 max-w-4xl mx-auto">
          <div className="flex justify-between items-center">
            <h2 className="text-xl font-semibold">Results ({filteredResults.length})</h2>

            {categories.length > 0 && (
              <div className="flex space-x-2">
                <button
                  type="button"
                  onClick={() => setActiveFilter(null)}
                  className={`px-3 py-1 text-sm rounded-full ${
                    activeFilter === null
                      ? 'bg-neutral-800 text-white dark:bg-neutral-200 dark:text-neutral-900'
                      : 'bg-neutral-200 text-neutral-700 dark:bg-neutral-800 dark:text-neutral-300'
                  }`}
                >
                  All
                </button>
                {categories.map(category => (
                  <button
                    type="button"
                    key={category}
                    onClick={() => setActiveFilter(category)}
                    className={`px-3 py-1 text-sm rounded-full ${
                      activeFilter === category
                        ? 'bg-neutral-800 text-white dark:bg-neutral-200 dark:text-neutral-900'
                        : 'bg-neutral-200 text-neutral-700 dark:bg-neutral-800 dark:text-neutral-300'
                    }`}
                  >
                    {category}
                  </button>
                ))}
              </div>
            )}
          </div>

          {Object.entries(resultsByWebsite).map(([website, files]) => (
            <div key={website} className="mb-8">
              <h3 className="text-lg font-medium mb-3">{website}</h3>
              {files.map((file, index) => (
                <LlmsTxtViewer key={index} file={file} />
              ))}
            </div>
          ))}
        </div>
      ) : query && !isLoading ? (
        <div className="text-center my-8 p-6 border border-neutral-200 rounded-lg dark:border-neutral-700 max-w-3xl mx-auto">
          <h3 className="text-xl font-semibold mb-2">No results found</h3>
          <p className="text-neutral-600 dark:text-neutral-400">
            We couldn't find any llms.txt files matching your search.
          </p>
        </div>
      ) : (
        <div className="text-center my-8 p-6 max-w-3xl mx-auto">
          <p className="text-neutral-700 dark:text-neutral-300">
            Enter a search term to find llms.txt files from across the web.
          </p>
        </div>
      )}
    </div>
  )
}
