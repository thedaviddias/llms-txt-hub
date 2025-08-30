'use client'

import { getRoute } from '@/lib/routes'
import { useDebounce } from '@thedaviddias/hooks/use-debounce'
import { useRouter } from 'next/navigation'
import type React from 'react'
import { useCallback, useState } from 'react'

/**
 * Client hook managing a search input and initiating navigation to the app's search route.
 *
 * Provides controlled search state, a debounced value (300ms), and an async handler that
 * navigates to the resolved search route with the query encoded. `handleSearch` resolves
 * immediately for empty or whitespace-only queries; otherwise it calls `router.push(...)`
 * and resolves after ~100ms to allow navigation to start.
 *
 * Returns an object with:
 * - `searchQuery`: current input value
 * - `setSearchQuery`: updater for the input value
 * - `debouncedSearchQuery`: `searchQuery` debounced by 300ms
 * - `handleSearch(searchQuery: string): Promise<void>`: triggers navigation to `getRoute('search')?q=...`
 */
export function useSearch() {
  const [searchQuery, setSearchQuery] = useState('')
  const debouncedSearchQuery = useDebounce(searchQuery, 300)
  const router = useRouter()

  const handleSearch = useCallback(
    async (searchQuery: string): Promise<void> => {
      if (!searchQuery.trim()) return Promise.resolve()

      return new Promise<void>(resolve => {
        const searchUrl = `${getRoute('search')}?q=${encodeURIComponent(searchQuery)}`
        router.push(searchUrl)

        // Use setTimeout to give the router time to start the navigation
        // This is a workaround since Next.js router doesn't provide a callback
        setTimeout(() => {
          resolve()
        }, 100)
      })
    },
    [router]
  )

  return {
    searchQuery,
    setSearchQuery,
    debouncedSearchQuery,
    handleSearch
  }
}
