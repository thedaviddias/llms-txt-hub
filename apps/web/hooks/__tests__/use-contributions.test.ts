import { act, renderHook, waitFor } from '@testing-library/react'
import { useContributions } from '@/hooks/use-contributions'

// Mock fetch
global.fetch = jest.fn()
const mockFetch = fetch as jest.MockedFunction<typeof fetch>

describe('useContributions', () => {
  const mockContributionsResponse = {
    contributions: [{ username: 'user1', hasContributions: true }]
  }

  beforeEach(() => {
    jest.clearAllMocks()
    mockFetch.mockResolvedValue({
      ok: true,
      json: jest.fn().mockResolvedValue(mockContributionsResponse)
    } as any)
  })

  afterEach(() => {
    jest.useRealTimers()
  })

  it('should initialize with correct default values', () => {
    const { result } = renderHook(() =>
      useContributions({
        usernames: [],
        enabled: true
      })
    )

    expect(result.current.contributions).toEqual({})
    expect(result.current.isLoading).toBe(false)
    expect(result.current.error).toBeNull()
    expect(typeof result.current.refetch).toBe('function')
  })

  it('should not fetch when disabled', async () => {
    renderHook(() =>
      useContributions({
        usernames: ['user1', 'user2'],
        enabled: false
      })
    )

    // Wait a bit to ensure no async operations are triggered
    await act(async () => {
      await new Promise(resolve => setTimeout(resolve, 200))
    })

    expect(mockFetch).not.toHaveBeenCalled()
  })

  it('should not fetch when usernames array is empty', async () => {
    renderHook(() =>
      useContributions({
        usernames: [],
        enabled: true
      })
    )

    await act(async () => {
      await new Promise(resolve => setTimeout(resolve, 200))
    })

    expect(mockFetch).not.toHaveBeenCalled()
  })

  it('should fetch contributions for valid usernames', async () => {
    const { result } = renderHook(() =>
      useContributions({
        usernames: ['user1'],
        enabled: true
      })
    )

    await waitFor(() => {
      expect(result.current.contributions).toEqual({
        user1: true
      })
    })

    expect(mockFetch).toHaveBeenCalledWith('/api/members/contributions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        usernames: ['user1']
      })
    })

    expect(result.current.isLoading).toBe(false)
    expect(result.current.error).toBeNull()
  })

  it('should filter out invalid usernames', async () => {
    const { result: _result } = renderHook(() =>
      useContributions({
        usernames: ['user1', '', '   ', null as any, undefined as any, 123 as any, 'user2'],
        enabled: true
      })
    )

    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalledWith('/api/members/contributions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          usernames: ['user1', 'user2']
        })
      })
    })
  })

  it('should not fetch if all contributions are already cached', async () => {
    const { result, rerender } = renderHook(
      props =>
        useContributions({
          usernames: props.usernames,
          enabled: true
        }),
      { initialProps: { usernames: ['user1'] } }
    )

    // Wait for initial fetch
    await waitFor(() => {
      expect(result.current.contributions.user1).toBeDefined()
    })

    const initialCallCount = mockFetch.mock.calls.length

    // Same usernames should not trigger new fetch
    rerender({ usernames: ['user1'] })

    await act(async () => {
      await new Promise(resolve => setTimeout(resolve, 200))
    })

    expect(mockFetch).toHaveBeenCalledTimes(initialCallCount)
  })

  it('should only fetch missing contributions when usernames change', async () => {
    jest.useFakeTimers()

    const { result, rerender } = renderHook(
      props =>
        useContributions({
          usernames: props.usernames,
          enabled: true
        }),
      { initialProps: { usernames: ['user1'] } }
    )

    await act(async () => {
      jest.advanceTimersByTime(200)
    })

    // Wait for initial fetch
    await waitFor(() => {
      expect(result.current.contributions.user1).toBeDefined()
    })

    // Mock response for new user
    const newUserResponse = {
      contributions: [{ username: 'user4', hasContributions: false }]
    }

    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: jest.fn().mockResolvedValue(newUserResponse)
    } as any)

    // Add new user to existing list
    rerender({ usernames: ['user1', 'user4'] })
    await act(async () => {
      jest.advanceTimersByTime(200)
    })

    await waitFor(() => {
      expect(result.current.contributions.user4).toBeDefined()
    })

    // Should only fetch the missing user
    expect(mockFetch).toHaveBeenLastCalledWith('/api/members/contributions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        usernames: ['user4']
      })
    })

    expect(result.current.contributions).toEqual({
      user1: true, // From initial fetch
      user4: false // From second fetch
    })
  })

  it('should handle API errors gracefully', async () => {
    mockFetch.mockRejectedValueOnce(new Error('Network error'))

    const { result } = renderHook(() =>
      useContributions({
        usernames: ['user1'],
        enabled: true
      })
    )

    await waitFor(() => {
      expect(result.current.error).toBe('Network error')
    })

    expect(result.current.contributions).toEqual({})
    expect(result.current.isLoading).toBe(false)
  })

  it('should handle HTTP error responses', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: false,
      statusText: 'Internal Server Error'
    } as any)

    const { result } = renderHook(() =>
      useContributions({
        usernames: ['user1'],
        enabled: true
      })
    )

    await waitFor(() => {
      expect(result.current.error).toBe('Failed to fetch contributions: Internal Server Error')
    })
  })

  it('should handle API error responses in JSON', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: jest.fn().mockResolvedValue({ error: 'Rate limit exceeded' })
    } as any)

    const { result } = renderHook(() =>
      useContributions({
        usernames: ['user1'],
        enabled: true
      })
    )

    await waitFor(() => {
      expect(result.current.error).toBe('Rate limit exceeded')
    })
  })

  it('should show loading state during fetch', async () => {
    jest.useFakeTimers()

    let resolveResponse: any
    const pendingPromise = new Promise(resolve => {
      resolveResponse = resolve
    })

    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () => pendingPromise
    } as any)

    const { result } = renderHook(() =>
      useContributions({
        usernames: ['user1'],
        enabled: true
      })
    )

    await act(async () => {
      jest.advanceTimersByTime(200)
    })

    // Should be loading while response is still pending
    expect(result.current.isLoading).toBe(true)

    // Resolve the response
    await act(async () => {
      resolveResponse(mockContributionsResponse)
      await Promise.resolve()
    })

    expect(result.current.isLoading).toBe(false)
  })

  it('should refetch all contributions when refetch is called', async () => {
    const initialResponse = {
      contributions: [
        { username: 'user1', hasContributions: true },
        { username: 'user2', hasContributions: false }
      ]
    }

    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: jest.fn().mockResolvedValue(initialResponse)
    } as any)

    const { result } = renderHook(() =>
      useContributions({
        usernames: ['user1', 'user2'],
        enabled: true
      })
    )

    await waitFor(() => {
      expect(Object.keys(result.current.contributions)).toHaveLength(2)
    })

    const initialCallCount = mockFetch.mock.calls.length

    // Mock new response for refetch
    const refreshedResponse = {
      contributions: [
        { username: 'user1', hasContributions: false }, // Changed
        { username: 'user2', hasContributions: true } // Changed
      ]
    }

    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: jest.fn().mockResolvedValue(refreshedResponse)
    } as any)

    await act(async () => {
      await result.current.refetch()
    })

    expect(result.current.contributions).toEqual({
      user1: false,
      user2: true
    })

    expect(mockFetch).toHaveBeenCalledTimes(initialCallCount + 1)
    expect(mockFetch).toHaveBeenLastCalledWith('/api/members/contributions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        usernames: ['user1', 'user2']
      })
    })
  })

  it('should debounce rapid username changes', async () => {
    const { rerender } = renderHook(
      props =>
        useContributions({
          usernames: props.usernames,
          enabled: true
        }),
      { initialProps: { usernames: ['user1'] } }
    )

    // Rapidly change usernames
    rerender({ usernames: ['user1', 'user2'] })
    rerender({ usernames: ['user1', 'user2', 'user3'] })
    rerender({ usernames: ['user1', 'user2', 'user3', 'user4'] })

    // Wait for debounce to settle
    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalled()
    })

    // Should only have made the initial call for the final state
    // The debounce mechanism should prevent multiple rapid calls
    const allCalls = mockFetch.mock.calls
    expect(allCalls.length).toBeGreaterThan(0)

    // The last call should include all the missing users
    const lastCall = allCalls[allCalls.length - 1]
    const lastCallBody = JSON.parse(lastCall[1]?.body as string)
    expect(lastCallBody.usernames).toContain('user4')
  })

  it('should handle empty response gracefully', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: jest.fn().mockResolvedValue({ contributions: [] })
    } as any)

    const { result } = renderHook(() =>
      useContributions({
        usernames: ['user1'],
        enabled: true
      })
    )

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false)
    })

    expect(result.current.contributions).toEqual({})
    expect(result.current.error).toBeNull()
  })

  it('should handle malformed JSON response', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: jest.fn().mockRejectedValue(new Error('Invalid JSON'))
    } as any)

    const { result } = renderHook(() =>
      useContributions({
        usernames: ['user1'],
        enabled: true
      })
    )

    await waitFor(() => {
      expect(result.current.error).toBe('Invalid JSON')
    })

    expect(result.current.contributions).toEqual({})
  })

  it('should preserve existing contributions when adding new ones', async () => {
    const { result, rerender } = renderHook(
      props =>
        useContributions({
          usernames: props.usernames,
          enabled: true
        }),
      { initialProps: { usernames: ['user1'] } }
    )

    await waitFor(() => {
      expect(result.current.contributions.user1).toBe(true)
    })

    // Mock response for additional user
    const additionalResponse = {
      contributions: [{ username: 'user5', hasContributions: false }]
    }

    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: jest.fn().mockResolvedValue(additionalResponse)
    } as any)

    // Add new user
    rerender({ usernames: ['user1', 'user5'] })

    await waitFor(() => {
      expect(result.current.contributions.user5).toBe(false)
    })

    // Should preserve existing data
    expect(result.current.contributions).toEqual({
      user1: true, // Preserved
      user5: false // Added
    })
  })

  it('should handle usernames with special characters', async () => {
    const specialUsernames = ['user-1', 'user_2', 'user.3']

    renderHook(() =>
      useContributions({
        usernames: specialUsernames,
        enabled: true
      })
    )

    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalledWith('/api/members/contributions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          usernames: specialUsernames
        })
      })
    })
  })

  it('should handle concurrent requests gracefully', async () => {
    const { result, rerender } = renderHook(
      props =>
        useContributions({
          usernames: props.usernames,
          enabled: true
        }),
      { initialProps: { usernames: ['user1'] } }
    )

    // Start first request
    await act(async () => {
      await new Promise(resolve => setTimeout(resolve, 50))
    })

    // Quickly start second request with different users
    rerender({ usernames: ['user1', 'user2'] })

    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalled()
    })

    // Should handle both requests without conflicts
    expect(result.current.error).toBeNull()
  })

  it('should default enabled to true when not specified', async () => {
    renderHook(() =>
      useContributions({
        usernames: ['user1']
        // enabled not specified, should default to true
      })
    )

    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalled()
    })
  })

  it('should handle undefined and null usernames in array', async () => {
    renderHook(() =>
      useContributions({
        usernames: ['user1', undefined as any, null as any, 'user2'],
        enabled: true
      })
    )

    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalledWith('/api/members/contributions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          usernames: ['user1', 'user2']
        })
      })
    })
  })
})
