'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'

// Traditional client-side pagination for static data
interface UseLoadMoreProps<T> {
  items: T[]
  initialItemsPerPage?: number
  itemsPerLoad?: number
}

interface UseLoadMoreReturn<T> {
  displayedItems: T[]
  hasMore: boolean
  isLoading: boolean
  currentPage: number
  totalPages: number
  loadMore: () => Promise<void>
  reset: () => void
  showItemsCount: number
  totalItemsCount: number
}

// API-based pagination for dynamic data fetching
interface UseApiLoadMoreProps {
  apiEndpoint: string
  initialPage?: number
  itemsPerPage?: number
  searchQuery?: string
  filter?: string
}

interface UseApiLoadMoreReturn<T> {
  items: T[]
  hasMore: boolean
  isLoading: boolean
  isLoadingMore: boolean
  currentPage: number
  totalPages: number
  totalCount: number
  error: string | null
  loadMore: () => Promise<void>
  reset: () => void
  refetch: () => Promise<void>
}

export function useLoadMore<T>({
  items,
  initialItemsPerPage = 12,
  itemsPerLoad = 12
}: UseLoadMoreProps<T>): UseLoadMoreReturn<T> {
  const [currentPage, setCurrentPage] = useState(1)
  const [isLoading, setIsLoading] = useState(false)

  const totalPages = Math.ceil(items.length / itemsPerLoad)
  const showItemsCount = Math.min(
    initialItemsPerPage + (currentPage - 1) * itemsPerLoad,
    items.length
  )

  const displayedItems = useMemo(() => {
    return items.slice(0, showItemsCount)
  }, [items, showItemsCount])

  const hasMore = showItemsCount < items.length

  const loadMore = useCallback(async () => {
    if (!hasMore || isLoading) return

    setIsLoading(true)

    // Simulate network delay for better UX
    await new Promise(resolve => setTimeout(resolve, 300))

    setCurrentPage(prev => prev + 1)
    setIsLoading(false)
  }, [hasMore, isLoading])

  const reset = useCallback(() => {
    setCurrentPage(1)
    setIsLoading(false)
  }, [])

  return {
    displayedItems,
    hasMore,
    isLoading,
    currentPage,
    totalPages,
    loadMore,
    reset,
    showItemsCount,
    totalItemsCount: items.length
  }
}

// New API-based hook for progressive loading
export function useApiLoadMore<T>({
  apiEndpoint,
  initialPage = 1,
  itemsPerPage = 12,
  searchQuery = '',
  filter = ''
}: UseApiLoadMoreProps): UseApiLoadMoreReturn<T> {
  const [items, setItems] = useState<T[]>([])
  const [currentPage, setCurrentPage] = useState(initialPage)
  const [totalPages, setTotalPages] = useState(0)
  const [totalCount, setTotalCount] = useState(0)
  const [hasMore, setHasMore] = useState(true)
  const [isLoading, setIsLoading] = useState(false)
  const [isLoadingMore, setIsLoadingMore] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [lastSearchQuery, setLastSearchQuery] = useState(searchQuery)
  const [lastFilter, setLastFilter] = useState(filter)

  // Build API URL with parameters
  const buildApiUrl = useCallback(
    (page: number, search?: string, filterValue?: string) => {
      const params = new URLSearchParams()
      params.set('page', page.toString())
      params.set('limit', itemsPerPage.toString())

      if (search?.trim()) {
        params.set('search', search.trim())
      }

      if (filterValue?.trim()) {
        params.set('filter', filterValue.trim())
      }

      return `${apiEndpoint}?${params.toString()}`
    },
    [apiEndpoint, itemsPerPage]
  )

  // Fetch data from API
  const fetchData = useCallback(
    async (page: number, isAppending = false, search?: string, filterValue?: string) => {
      try {
        if (isAppending) {
          setIsLoadingMore(true)
        } else {
          setIsLoading(true)
          setError(null)
        }

        const url = buildApiUrl(page, search, filterValue)
        const response = await fetch(url)

        if (!response.ok) {
          throw new Error(`Failed to fetch data: ${response.statusText}`)
        }

        const data = await response.json()

        if (data.error) {
          throw new Error(data.error)
        }

        const { members, pagination } = data

        if (isAppending) {
          setItems(prevItems => [...prevItems, ...members])
        } else {
          setItems(members)
        }

        setTotalPages(pagination.totalPages)
        setTotalCount(pagination.total)
        setHasMore(pagination.hasMore)
        setCurrentPage(page)
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'An error occurred'
        setError(errorMessage)
        console.error('Error fetching data:', err)
      } finally {
        setIsLoading(false)
        setIsLoadingMore(false)
      }
    },
    [buildApiUrl]
  )

  // Load more items (next page)
  const loadMore = useCallback(async () => {
    if (!hasMore || isLoadingMore || isLoading) return

    await fetchData(currentPage + 1, true, searchQuery, filter)
  }, [hasMore, isLoadingMore, isLoading, currentPage, fetchData, searchQuery, filter])

  // Reset to first page
  const reset = useCallback(() => {
    setCurrentPage(1)
    setItems([])
    setError(null)
    setHasMore(true)
    fetchData(1, false, searchQuery, filter)
  }, [fetchData, searchQuery, filter])

  // Refetch current data
  const refetch = useCallback(async () => {
    await fetchData(1, false, searchQuery, filter)
  }, [fetchData, searchQuery, filter])

  // Effect to handle search/filter changes
  useEffect(() => {
    const searchChanged = searchQuery !== lastSearchQuery
    const filterChanged = filter !== lastFilter

    if (searchChanged || filterChanged) {
      setLastSearchQuery(searchQuery)
      setLastFilter(filter)
      setCurrentPage(1)
      setItems([])
      setError(null)
      setHasMore(true)
      fetchData(1, false, searchQuery, filter)
    }
  }, [searchQuery, filter, lastSearchQuery, lastFilter, fetchData])

  // Initial data load
  useEffect(() => {
    if (items.length === 0 && !isLoading && !error) {
      fetchData(initialPage, false, searchQuery, filter)
    }
  }, [fetchData, initialPage, searchQuery, filter, items.length, isLoading, error])

  return {
    items,
    hasMore,
    isLoading,
    isLoadingMore,
    currentPage,
    totalPages,
    totalCount,
    error,
    loadMore,
    reset,
    refetch
  }
}
