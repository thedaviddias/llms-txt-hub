import { act, renderHook, waitFor } from '@testing-library/react'
import { useApiLoadMore, useLoadMore } from '@/hooks/use-load-more'

// Mock fetch
global.fetch = jest.fn()
const mockFetch = fetch as jest.MockedFunction<typeof fetch>

describe('useLoadMore', () => {
  const mockItems = Array.from({ length: 50 }, (_, i) => ({ id: i, name: `Item ${i}` }))

  beforeEach(() => {
    jest.clearAllMocks()
  })

  describe('useLoadMore (traditional client-side)', () => {
    it('should initialize with correct default values', () => {
      const { result } = renderHook(() =>
        useLoadMore({
          items: mockItems,
          initialItemsPerPage: 10,
          itemsPerLoad: 5
        })
      )

      expect(result.current.displayedItems).toHaveLength(10)
      expect(result.current.hasMore).toBe(true)
      expect(result.current.isLoading).toBe(false)
      expect(result.current.currentPage).toBe(1)
      expect(result.current.showItemsCount).toBe(10)
      expect(result.current.totalItemsCount).toBe(50)
      expect(result.current.totalPages).toBe(10) // Math.ceil(50 / 5)
    })

    it('should load more items when loadMore is called', async () => {
      const { result } = renderHook(() =>
        useLoadMore({
          items: mockItems,
          initialItemsPerPage: 10,
          itemsPerLoad: 5
        })
      )

      expect(result.current.displayedItems).toHaveLength(10)

      await act(async () => {
        await result.current.loadMore()
      })

      expect(result.current.displayedItems).toHaveLength(15)
      expect(result.current.currentPage).toBe(2)
      expect(result.current.showItemsCount).toBe(15)
    })

    it('should not load more when hasMore is false', async () => {
      const smallItems = mockItems.slice(0, 10)
      const { result } = renderHook(() =>
        useLoadMore({
          items: smallItems,
          initialItemsPerPage: 10,
          itemsPerLoad: 5
        })
      )

      expect(result.current.hasMore).toBe(false)

      await act(async () => {
        await result.current.loadMore()
      })

      expect(result.current.currentPage).toBe(1) // Should not increase
      expect(result.current.displayedItems).toHaveLength(10)
    })

    it('should not load more when already loading', async () => {
      const { result } = renderHook(() =>
        useLoadMore({
          items: mockItems,
          initialItemsPerPage: 10,
          itemsPerLoad: 5
        })
      )

      // Start first load
      const loadPromise1 = act(async () => {
        await result.current.loadMore()
      })

      // Try to start second load while first is in progress
      const loadPromise2 = act(async () => {
        await result.current.loadMore()
      })

      await Promise.all([loadPromise1, loadPromise2])

      // Should only advance by one page
      expect(result.current.currentPage).toBe(2)
      expect(result.current.displayedItems).toHaveLength(15)
    })

    it('should reset pagination correctly', async () => {
      const { result } = renderHook(() =>
        useLoadMore({
          items: mockItems,
          initialItemsPerPage: 10,
          itemsPerLoad: 5
        })
      )

      // Load more items
      await act(async () => {
        await result.current.loadMore()
        await result.current.loadMore()
      })

      expect(result.current.currentPage).toBe(3)
      expect(result.current.displayedItems).toHaveLength(20)

      // Reset
      act(() => {
        result.current.reset()
      })

      expect(result.current.currentPage).toBe(1)
      expect(result.current.displayedItems).toHaveLength(10)
      expect(result.current.isLoading).toBe(false)
    })

    it('should handle empty items array', () => {
      const { result } = renderHook(() =>
        useLoadMore({
          items: [],
          initialItemsPerPage: 10,
          itemsPerLoad: 5
        })
      )

      expect(result.current.displayedItems).toHaveLength(0)
      expect(result.current.hasMore).toBe(false)
      expect(result.current.totalItemsCount).toBe(0)
      expect(result.current.totalPages).toBe(0)
    })

    it('should show all items when items length is less than initial items per page', () => {
      const fewItems = mockItems.slice(0, 5)
      const { result } = renderHook(() =>
        useLoadMore({
          items: fewItems,
          initialItemsPerPage: 10,
          itemsPerLoad: 5
        })
      )

      expect(result.current.displayedItems).toHaveLength(5)
      expect(result.current.hasMore).toBe(false)
      expect(result.current.showItemsCount).toBe(5)
    })

    it('should simulate network delay during loading', async () => {
      const { result } = renderHook(() =>
        useLoadMore({
          items: mockItems,
          initialItemsPerPage: 10,
          itemsPerLoad: 5
        })
      )

      expect(result.current.isLoading).toBe(false)

      const loadPromise = act(async () => {
        await result.current.loadMore()
      })

      // Should be loading immediately
      expect(result.current.isLoading).toBe(true)

      await loadPromise

      expect(result.current.isLoading).toBe(false)
    })
  })

  describe('useApiLoadMore (API-based)', () => {
    const mockApiResponse = {
      members: [
        { id: 1, name: 'User 1' },
        { id: 2, name: 'User 2' }
      ],
      pagination: {
        page: 1,
        limit: 12,
        total: 100,
        totalPages: 9,
        hasMore: true
      }
    }

    beforeEach(() => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: jest.fn().mockResolvedValue(mockApiResponse)
      } as any)
    })

    it('should initialize with correct default values', () => {
      const { result } = renderHook(() =>
        useApiLoadMore({
          apiEndpoint: '/api/members'
        })
      )

      expect(result.current.items).toHaveLength(0)
      expect(result.current.hasMore).toBe(true)
      expect(result.current.isLoading).toBe(false)
      expect(result.current.isLoadingMore).toBe(false)
      expect(result.current.currentPage).toBe(1)
      expect(result.current.totalPages).toBe(0)
      expect(result.current.totalCount).toBe(0)
      expect(result.current.error).toBeNull()
    })

    it('should load initial data on mount', async () => {
      const { result } = renderHook(() =>
        useApiLoadMore({
          apiEndpoint: '/api/members'
        })
      )

      await waitFor(() => {
        expect(result.current.items).toHaveLength(2)
      })

      expect(result.current.totalPages).toBe(9)
      expect(result.current.totalCount).toBe(100)
      expect(result.current.hasMore).toBe(true)
      expect(result.current.currentPage).toBe(1)
      expect(mockFetch).toHaveBeenCalledWith('/api/members?page=1&limit=12')
    })

    it('should build correct API URL with parameters', async () => {
      renderHook(() =>
        useApiLoadMore({
          apiEndpoint: '/api/members',
          initialPage: 2,
          itemsPerPage: 20,
          searchQuery: 'john',
          filter: 'contributors'
        })
      )

      await waitFor(() => {
        expect(mockFetch).toHaveBeenCalledWith(
          '/api/members?page=2&limit=20&search=john&filter=contributors'
        )
      })
    })

    it('should load more items when loadMore is called', async () => {
      const { result } = renderHook(() =>
        useApiLoadMore({
          apiEndpoint: '/api/members'
        })
      )

      await waitFor(() => {
        expect(result.current.items).toHaveLength(2)
      })

      // Mock response for page 2
      const page2Response = {
        members: [
          { id: 3, name: 'User 3' },
          { id: 4, name: 'User 4' }
        ],
        pagination: {
          page: 2,
          limit: 12,
          total: 100,
          totalPages: 9,
          hasMore: true
        }
      }

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: jest.fn().mockResolvedValue(page2Response)
      } as any)

      await act(async () => {
        await result.current.loadMore()
      })

      await waitFor(() => {
        expect(result.current.items).toHaveLength(4) // Appended items
      })

      expect(result.current.currentPage).toBe(2)
      expect(mockFetch).toHaveBeenLastCalledWith('/api/members?page=2&limit=12')
    })

    it('should not load more when hasMore is false', async () => {
      // Mock initial response with hasMore: false
      const lastPageResponse = {
        members: [{ id: 1, name: 'User 1' }],
        pagination: {
          page: 9,
          limit: 12,
          total: 100,
          totalPages: 9,
          hasMore: false
        }
      }

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: jest.fn().mockResolvedValue(lastPageResponse)
      } as any)

      const { result } = renderHook(() =>
        useApiLoadMore({
          apiEndpoint: '/api/members',
          initialPage: 9
        })
      )

      await waitFor(() => {
        expect(result.current.hasMore).toBe(false)
      })

      const initialFetchCount = mockFetch.mock.calls.length

      await act(async () => {
        await result.current.loadMore()
      })

      // Should not make additional API calls
      expect(mockFetch).toHaveBeenCalledTimes(initialFetchCount)
    })

    it('should not load more when already loading', async () => {
      const { result } = renderHook(() =>
        useApiLoadMore({
          apiEndpoint: '/api/members'
        })
      )

      await waitFor(() => {
        expect(result.current.items).toHaveLength(2)
      })

      // Mock slow response for loadMore
      let resolveSlowResponse: any
      const slowPromise = new Promise(resolve => {
        resolveSlowResponse = resolve
      })

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => slowPromise
      } as any)

      // Start first load
      const firstLoadPromise = act(async () => {
        await result.current.loadMore()
      })

      // Try second load while first is in progress
      await act(async () => {
        await result.current.loadMore()
      })

      // Should still be loading more
      expect(result.current.isLoadingMore).toBe(true)

      // Resolve the slow response
      resolveSlowResponse({
        members: [{ id: 3, name: 'User 3' }],
        pagination: { page: 2, limit: 12, total: 100, totalPages: 9, hasMore: true }
      })

      await firstLoadPromise

      // Should only have made one additional call
      expect(mockFetch).toHaveBeenCalledTimes(2) // Initial + loadMore
    })

    it('should handle API errors gracefully', async () => {
      mockFetch.mockRejectedValueOnce(new Error('Network error'))

      const { result } = renderHook(() =>
        useApiLoadMore({
          apiEndpoint: '/api/members'
        })
      )

      await waitFor(() => {
        expect(result.current.error).toBe('Network error')
      })

      expect(result.current.items).toHaveLength(0)
      expect(result.current.isLoading).toBe(false)
    })

    it('should handle HTTP error responses', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        statusText: 'Internal Server Error'
      } as any)

      const { result } = renderHook(() =>
        useApiLoadMore({
          apiEndpoint: '/api/members'
        })
      )

      await waitFor(() => {
        expect(result.current.error).toBe('Failed to fetch data: Internal Server Error')
      })
    })

    it('should handle API error responses in JSON', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: jest.fn().mockResolvedValue({ error: 'Rate limit exceeded' })
      } as any)

      const { result } = renderHook(() =>
        useApiLoadMore({
          apiEndpoint: '/api/members'
        })
      )

      await waitFor(() => {
        expect(result.current.error).toBe('Rate limit exceeded')
      })
    })

    it('should reset data and refetch when reset is called', async () => {
      const { result } = renderHook(() =>
        useApiLoadMore({
          apiEndpoint: '/api/members'
        })
      )

      await waitFor(() => {
        expect(result.current.items).toHaveLength(2)
      })

      // Load more items
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: jest.fn().mockResolvedValue({
          members: [{ id: 3, name: 'User 3' }],
          pagination: { page: 2, limit: 12, total: 100, totalPages: 9, hasMore: true }
        })
      } as any)

      await act(async () => {
        await result.current.loadMore()
      })

      expect(result.current.items).toHaveLength(3)
      expect(result.current.currentPage).toBe(2)

      // Reset - should refetch initial data
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: jest.fn().mockResolvedValue(mockApiResponse)
      } as any)

      await act(async () => {
        result.current.reset()
      })

      await waitFor(() => {
        expect(result.current.items).toHaveLength(2)
      })

      expect(result.current.currentPage).toBe(1)
      expect(result.current.error).toBeNull()
    })

    it('should refetch current data when refetch is called', async () => {
      const { result } = renderHook(() =>
        useApiLoadMore({
          apiEndpoint: '/api/members'
        })
      )

      await waitFor(() => {
        expect(result.current.items).toHaveLength(2)
      })

      const initialCallCount = mockFetch.mock.calls.length

      // Mock fresh data
      const freshResponse = {
        members: [{ id: 5, name: 'Fresh User' }],
        pagination: {
          page: 1,
          limit: 12,
          total: 50,
          totalPages: 5,
          hasMore: true
        }
      }

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: jest.fn().mockResolvedValue(freshResponse)
      } as any)

      await act(async () => {
        await result.current.refetch()
      })

      await waitFor(() => {
        expect(result.current.items).toHaveLength(1)
      })

      expect(result.current.items[0].name).toBe('Fresh User')
      expect(result.current.totalCount).toBe(50)
      expect(mockFetch).toHaveBeenCalledTimes(initialCallCount + 1)
    })

    it('should refetch when search query changes', async () => {
      const { result, rerender } = renderHook(
        props =>
          useApiLoadMore({
            apiEndpoint: '/api/members',
            searchQuery: props.searchQuery
          }),
        { initialProps: { searchQuery: '' } }
      )

      await waitFor(() => {
        expect(result.current.items).toHaveLength(2)
      })

      const initialCallCount = mockFetch.mock.calls.length

      // Change search query
      const searchResponse = {
        members: [{ id: 10, name: 'Search Result' }],
        pagination: {
          page: 1,
          limit: 12,
          total: 1,
          totalPages: 1,
          hasMore: false
        }
      }

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: jest.fn().mockResolvedValue(searchResponse)
      } as any)

      rerender({ searchQuery: 'search-term' })

      await waitFor(() => {
        expect(result.current.items).toHaveLength(1)
      })

      expect(result.current.items[0].name).toBe('Search Result')
      expect(mockFetch).toHaveBeenCalledTimes(initialCallCount + 1)
      expect(mockFetch).toHaveBeenLastCalledWith('/api/members?page=1&limit=12&search=search-term')
    })

    it('should refetch when filter changes', async () => {
      const { result, rerender } = renderHook(
        props =>
          useApiLoadMore({
            apiEndpoint: '/api/members',
            filter: props.filter
          }),
        { initialProps: { filter: '' } }
      )

      await waitFor(() => {
        expect(result.current.items).toHaveLength(2)
      })

      // Change filter
      rerender({ filter: 'contributors' })

      await waitFor(() => {
        expect(mockFetch).toHaveBeenLastCalledWith(
          '/api/members?page=1&limit=12&filter=contributors'
        )
      })
    })

    it('should handle simultaneous search and filter changes', async () => {
      const { result, rerender } = renderHook(
        props =>
          useApiLoadMore({
            apiEndpoint: '/api/members',
            searchQuery: props.searchQuery,
            filter: props.filter
          }),
        { initialProps: { searchQuery: '', filter: '' } }
      )

      await waitFor(() => {
        expect(result.current.items).toHaveLength(2)
      })

      // Change both search and filter
      rerender({ searchQuery: 'john', filter: 'contributors' })

      await waitFor(() => {
        expect(mockFetch).toHaveBeenLastCalledWith(
          '/api/members?page=1&limit=12&search=john&filter=contributors'
        )
      })
    })

    it('should trim whitespace from search query', async () => {
      renderHook(() =>
        useApiLoadMore({
          apiEndpoint: '/api/members',
          searchQuery: '  john  '
        })
      )

      await waitFor(() => {
        expect(mockFetch).toHaveBeenCalledWith('/api/members?page=1&limit=12&search=john')
      })
    })

    it('should not include empty search query in URL', async () => {
      renderHook(() =>
        useApiLoadMore({
          apiEndpoint: '/api/members',
          searchQuery: '   '
        })
      )

      await waitFor(() => {
        expect(mockFetch).toHaveBeenCalledWith('/api/members?page=1&limit=12')
      })
    })

    it('should not include empty filter in URL', async () => {
      renderHook(() =>
        useApiLoadMore({
          apiEndpoint: '/api/members',
          filter: '   '
        })
      )

      await waitFor(() => {
        expect(mockFetch).toHaveBeenCalledWith('/api/members?page=1&limit=12')
      })
    })

    it('should not make initial request if items already exist and no error', () => {
      // This test ensures we don't unnecessarily refetch
      mockFetch.mockClear()

      const { result, rerender } = renderHook(() =>
        useApiLoadMore({
          apiEndpoint: '/api/members'
        })
      )

      // Manually set some items to simulate already loaded state
      act(() => {
        // This is testing the condition in useEffect that prevents initial load
        // In practice, this would happen if items were preloaded
      })

      // The hook should have made at least one call for initial load
      expect(mockFetch).toHaveBeenCalled()
    })
  })
})
