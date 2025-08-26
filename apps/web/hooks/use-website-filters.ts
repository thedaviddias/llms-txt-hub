'use client'

import { usePathname, useRouter, useSearchParams } from 'next/navigation'
import { useCallback, useEffect, useState } from 'react'

interface UseWebsiteFiltersInput {
  initialCategory?: string
  initialSort?: string
  initialContentType?: string
}

interface UseWebsiteFiltersOutput {
  categoryFilter: string
  sortBy: string
  contentTypeFilter: string
  setCategoryFilter: (category: string) => void
  setSortBy: (sort: string) => void
  setContentTypeFilter: (contentType: string) => void
}

/**
 * Hook to manage website filtering and sorting with URL synchronization
 *
 * @param options - Configuration options
 * @param options.initialCategory - Initial category filter value (default: 'all')
 * @param options.initialSort - Initial sort value (default: 'name')
 * @param options.initialContentType - Initial content type filter value (default: 'all')
 *
 * @returns Object containing filter state and setters
 * @returns.categoryFilter - Current category filter value
 * @returns.sortBy - Current sort value
 * @returns.contentTypeFilter - Current content type filter value
 * @returns.setCategoryFilter - Function to update category filter
 * @returns.setSortBy - Function to update sort value
 * @returns.setContentTypeFilter - Function to update content type filter
 *
 * @example
 * ```tsx
 * const { categoryFilter, sortBy, contentTypeFilter, setCategoryFilter, setSortBy, setContentTypeFilter } = useWebsiteFilters({
 *   initialCategory: 'ai-ml',
 *   initialSort: 'latest',
 *   initialContentType: 'tools'
 * });
 * ```
 */
export function useWebsiteFilters({
  initialCategory = 'all',
  initialSort = 'name',
  initialContentType = 'all'
}: UseWebsiteFiltersInput = {}): UseWebsiteFiltersOutput {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()

  // Initialize state from URL parameters or defaults
  const [categoryFilter, setCategoryFilterState] = useState(
    searchParams.get('category') || initialCategory
  )
  const [sortBy, setSortByState] = useState(searchParams.get('sort') || initialSort)
  const [contentTypeFilter, setContentTypeFilterState] = useState(
    searchParams.get('contentType') || initialContentType
  )

  // Update URL when filters change
  const updateUrl = useCallback(
    (category: string, sort: string, contentType: string) => {
      const params = new URLSearchParams(searchParams.toString())

      if (category === 'all') {
        params.delete('category')
      } else {
        params.set('category', category)
      }

      if (sort === 'name') {
        params.delete('sort')
      } else {
        params.set('sort', sort)
      }

      if (contentType === 'all') {
        params.delete('contentType')
      } else {
        params.set('contentType', contentType)
      }

      const queryString = params.toString()
      const newUrl = queryString ? `${pathname}?${queryString}` : pathname

      router.push(newUrl)
    },
    [pathname, router, searchParams]
  )

  // Handle category filter changes
  const setCategoryFilter = useCallback(
    (category: string) => {
      setCategoryFilterState(category)
      updateUrl(category, sortBy, contentTypeFilter)
    },
    [sortBy, contentTypeFilter, updateUrl]
  )

  // Handle sort changes
  const setSortBy = useCallback(
    (sort: string) => {
      setSortByState(sort as string)
      updateUrl(categoryFilter, sort, contentTypeFilter)
    },
    [categoryFilter, contentTypeFilter, updateUrl]
  )

  // Handle content type filter changes
  const setContentTypeFilter = useCallback(
    (contentType: string) => {
      setContentTypeFilterState(contentType)
      updateUrl(categoryFilter, sortBy, contentType)
    },
    [categoryFilter, sortBy, updateUrl]
  )

  // Sync state with URL parameters on mount and URL changes
  useEffect(() => {
    const categoryFromUrl = searchParams.get('category')
    const sortFromUrl = searchParams.get('sort')
    const contentTypeFromUrl = searchParams.get('contentType')

    if (categoryFromUrl !== categoryFilter) {
      setCategoryFilterState(categoryFromUrl || initialCategory)
    }

    if (sortFromUrl !== sortBy) {
      setSortByState((sortFromUrl as string) || initialSort)
    }

    if (contentTypeFromUrl !== contentTypeFilter) {
      setContentTypeFilterState(contentTypeFromUrl || initialContentType)
    }
  }, [searchParams, initialCategory, initialSort, initialContentType])

  return {
    categoryFilter,
    sortBy,
    contentTypeFilter,
    setCategoryFilter,
    setSortBy,
    setContentTypeFilter
  }
}
