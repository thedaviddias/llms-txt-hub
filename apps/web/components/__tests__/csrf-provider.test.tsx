/**
 * @jest-environment jsdom
 */

import { render, waitFor } from '@testing-library/react'
import { CSRFProvider } from '@/components/csrf-provider'

// Mock fetch
global.fetch = jest.fn()

describe('CSRFProvider', () => {
  const mockFetch = global.fetch as jest.MockedFunction<typeof fetch>

  beforeEach(() => {
    // Clear any existing meta tags
    document.querySelectorAll('meta[name="csrf-token"]').forEach(tag => {
      tag.remove()
    })
    // Reset fetch mock
    jest.clearAllMocks()
    // Clear console errors
    jest.spyOn(console, 'error').mockImplementation(() => {})
  })

  afterEach(() => {
    jest.restoreAllMocks()
  })

  it('should render without crashing', () => {
    render(<CSRFProvider />)
    // Component should render nothing visually
    expect(document.body.textContent).toBe('')
  })

  it('should fetch CSRF token and create meta tag on mount', async () => {
    // Mock successful fetch response
    mockFetch.mockResolvedValueOnce(
      new Response(JSON.stringify({ token: 'test-csrf-token-123' }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      })
    )

    render(<CSRFProvider />)

    // Wait for the fetch to complete and meta tag to be created
    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalledWith('/api/csrf', { method: 'GET' })
    })

    await waitFor(() => {
      const metaTag = document.querySelector('meta[name="csrf-token"]') as HTMLMetaElement
      expect(metaTag).toBeTruthy()
      expect(metaTag.content).toBe('test-csrf-token-123')
    })
  })

  it('should update existing meta tag if it already exists', async () => {
    // Create an existing meta tag
    const existingMetaTag = document.createElement('meta')
    existingMetaTag.name = 'csrf-token'
    existingMetaTag.content = 'old-token'
    document.head.appendChild(existingMetaTag)

    // Mock successful fetch response
    mockFetch.mockResolvedValueOnce(
      new Response(JSON.stringify({ token: 'new-csrf-token-456' }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      })
    )

    render(<CSRFProvider />)

    // Wait for the fetch to complete and meta tag to be updated
    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalledWith('/api/csrf', { method: 'GET' })
    })

    await waitFor(() => {
      const metaTag = document.querySelector('meta[name="csrf-token"]') as HTMLMetaElement
      expect(metaTag).toBeTruthy()
      expect(metaTag.content).toBe('new-csrf-token-456')

      // Should still be only one meta tag
      const allMetaTags = document.querySelectorAll('meta[name="csrf-token"]')
      expect(allMetaTags).toHaveLength(1)
    })
  })

  it('should handle failed fetch response gracefully', async () => {
    const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {})

    // Mock failed fetch response
    mockFetch.mockResolvedValueOnce(new Response('Internal Server Error', { status: 500 }))

    render(<CSRFProvider />)

    // Wait for the fetch to complete
    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalledWith('/api/csrf', { method: 'GET' })
    })

    // Should not create a meta tag
    await waitFor(() => {
      const metaTag = document.querySelector('meta[name="csrf-token"]')
      expect(metaTag).toBeFalsy()
    })

    // Should not throw an error (handled gracefully)
    expect(consoleSpy).not.toHaveBeenCalled()
  })

  it('should handle network errors gracefully', async () => {
    const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {})

    // Mock network error
    mockFetch.mockRejectedValueOnce(new Error('Network error'))

    render(<CSRFProvider />)

    // Wait for the fetch to complete
    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalledWith('/api/csrf', { method: 'GET' })
    })

    // Should log the error
    await waitFor(() => {
      expect(consoleSpy).toHaveBeenCalledWith('Failed to initialize CSRF token:', expect.any(Error))
    })

    // Should not create a meta tag
    const metaTag = document.querySelector('meta[name="csrf-token"]')
    expect(metaTag).toBeFalsy()
  })

  it('should not create meta tag when response has no token', async () => {
    // Mock response without token
    mockFetch.mockResolvedValueOnce(
      new Response(JSON.stringify({}), {
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      })
    )

    render(<CSRFProvider />)

    // Wait for the fetch to complete
    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalledWith('/api/csrf', { method: 'GET' })
    })

    // Should not create a meta tag
    await waitFor(() => {
      const metaTag = document.querySelector('meta[name="csrf-token"]')
      expect(metaTag).toBeFalsy()
    })
  })

  it('should handle invalid JSON response gracefully', async () => {
    const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {})

    // Mock response with invalid JSON
    mockFetch.mockResolvedValueOnce(
      new Response('invalid json', {
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      })
    )

    render(<CSRFProvider />)

    // Wait for the fetch to complete
    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalledWith('/api/csrf', { method: 'GET' })
    })

    // Should log the error
    await waitFor(() => {
      expect(consoleSpy).toHaveBeenCalledWith('Failed to initialize CSRF token:', expect.any(Error))
    })

    // Should not create a meta tag
    const metaTag = document.querySelector('meta[name="csrf-token"]')
    expect(metaTag).toBeFalsy()
  })
})
