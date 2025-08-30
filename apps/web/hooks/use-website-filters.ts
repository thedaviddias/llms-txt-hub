'use client'

import { usePathname, useRouter, useSearchParams } from 'next/navigation'
import { useCallback, useEffect, useState } from 'react'

interface UseWebsiteFiltersInput {
  initialCategory?: string
  initialSort?: string
  includeCategory?: boolean // New option to control category handling
}

interface UseWebsiteFiltersOutput {
  categoryFilter: string
  sortBy: string
  setCategoryFilter: (category: string) => void
  setSortBy: (sort: string) => void
}

/**
 * Hook to manage website filtering and sorting with URL synchronization
 *
 * @param options - Configuration options
 * @param options.initialCategory - Initial category filter value (default: 'all')
 * @param options.initialSort - Initial sort value (default: 'name')
 *
 * @returns Object containing filter state and setters
 * @returns.categoryFilter - Current category filter value
 * @returns.sortBy - Current sort value
 * @returns.setCategoryFilter - Function to update category filter
 * @returns.setSortBy - Function to update sort value
 *
 * @example
 * ```tsx
 * const { categoryFilter, sortBy, setCategoryFilter, setSortBy } = useWebsiteFilters({
 *   initialCategory: 'ai-ml',
 *   initialSort: 'latest'
 * });
 * ```
 */
export function useWebsiteFilters({
  initialCategory = 'all',
  initialSort = 'name',
  includeCategory = true
}: UseWebsiteFiltersInput = {}): UseWebsiteFiltersOutput {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()

  // Initialize state from URL parameters or defaults
  const [categoryFilter, setCategoryFilterState] = useState(
    searchParams.get('category') || initialCategory
  )
  const [sortBy, setSortByState] = useState(searchParams.get('sort') || initialSort)

  // Update URL when filters change
  const updateUrl = useCallback(
    (category: string, sort: string) => {
      const params = new URLSearchParams(searchParams.toString())

      // Only handle category if includeCategory is true
      if (includeCategory) {
        if (category === 'all') {
          params.delete('category')
        } else {
          params.set('category', category)
        }
      }

      if (sort === 'name') {
        params.delete('sort')
      } else {
        params.set('sort', sort)
      }

      const queryString = params.toString()
      const newUrl = queryString ? `${pathname}?${queryString}` : pathname

      router.push(newUrl)
    },
    [pathname, router, searchParams, includeCategory]
  )

  // Handle category filter changes
  const setCategoryFilter = useCallback(
    (category: string) => {
      setCategoryFilterState(category)
      updateUrl(category, sortBy)
    },
    [sortBy, updateUrl]
  )

  // Handle sort changes
  const setSortBy = useCallback(
    (sort: string) => {
      setSortByState(sort as string)
      updateUrl(categoryFilter, sort)
    },
    [categoryFilter, updateUrl]
  )

  // Sync state with URL parameters on mount and URL changes
  useEffect(() => {
    const categoryFromUrl = searchParams.get('category')
    const sortFromUrl = searchParams.get('sort')

    if (categoryFromUrl !== categoryFilter) {
      setCategoryFilterState(categoryFromUrl || initialCategory)
    }

    if (sortFromUrl !== sortBy) {
      setSortByState((sortFromUrl as string) || initialSort)
    }
  }, [searchParams, initialCategory, initialSort])

  return {
    categoryFilter,
    sortBy,
    setCategoryFilter,
    setSortBy
  }
}
