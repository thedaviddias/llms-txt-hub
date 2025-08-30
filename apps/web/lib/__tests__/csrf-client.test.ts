/**
 * @jest-environment jsdom
 */

import { fetchWithCSRF, getCSRFTokenForClient } from '@/lib/csrf-client'

// Mock fetch
global.fetch = jest.fn()

describe('csrf-client', () => {
  beforeEach(() => {
    // Clear any existing meta tags
    document.querySelectorAll('meta[name="csrf-token"]').forEach(tag => {
      tag.remove()
    })
    // Reset fetch mock
    jest.clearAllMocks()
  })

  describe('getCSRFTokenForClient', () => {
    it('should return empty string when no meta tag exists', () => {
      const token = getCSRFTokenForClient()
      expect(token).toBe('')
    })

    it('should return token from meta tag when it exists', () => {
      // Create a meta tag
      const metaTag = document.createElement('meta')
      metaTag.name = 'csrf-token'
      metaTag.content = 'test-token-123'
      document.head.appendChild(metaTag)

      const token = getCSRFTokenForClient()
      expect(token).toBe('test-token-123')
    })

    it('should return empty string when meta tag has no content', () => {
      // Create a meta tag without content
      const metaTag = document.createElement('meta')
      metaTag.name = 'csrf-token'
      document.head.appendChild(metaTag)

      const token = getCSRFTokenForClient()
      expect(token).toBe('')
    })

    it('should handle server-side rendering (no window)', () => {
      const originalWindow = global.window
      // @ts-expect-error - testing SSR scenario
      global.window = undefined

      const token = getCSRFTokenForClient()
      expect(token).toBe('')

      global.window = originalWindow
    })
  })

  describe('fetchWithCSRF', () => {
    const mockFetch = global.fetch as jest.MockedFunction<typeof fetch>

    beforeEach(() => {
      mockFetch.mockResolvedValue(new Response('{}', { status: 200 }))
    })

    it('should call fetch without CSRF token for GET requests', async () => {
      await fetchWithCSRF('/api/test', { method: 'GET' })

      expect(mockFetch).toHaveBeenCalledWith('/api/test', {
        method: 'GET'
      })
    })

    it('should call fetch without CSRF token for HEAD requests', async () => {
      await fetchWithCSRF('/api/test', { method: 'HEAD' })

      expect(mockFetch).toHaveBeenCalledWith('/api/test', {
        method: 'HEAD'
      })
    })

    it('should add CSRF token for POST requests when token is available', async () => {
      // Create a meta tag with token
      const metaTag = document.createElement('meta')
      metaTag.name = 'csrf-token'
      metaTag.content = 'test-token-123'
      document.head.appendChild(metaTag)

      await fetchWithCSRF('/api/test', { method: 'POST' })

      expect(mockFetch).toHaveBeenCalledWith('/api/test', {
        method: 'POST',
        headers: {
          'x-csrf-token': 'test-token-123'
        }
      })
    })

    it('should add CSRF token for PUT requests when token is available', async () => {
      // Create a meta tag with token
      const metaTag = document.createElement('meta')
      metaTag.name = 'csrf-token'
      metaTag.content = 'test-token-456'
      document.head.appendChild(metaTag)

      await fetchWithCSRF('/api/test', { method: 'PUT' })

      expect(mockFetch).toHaveBeenCalledWith('/api/test', {
        method: 'PUT',
        headers: {
          'x-csrf-token': 'test-token-456'
        }
      })
    })

    it('should add CSRF token for DELETE requests when token is available', async () => {
      // Create a meta tag with token
      const metaTag = document.createElement('meta')
      metaTag.name = 'csrf-token'
      metaTag.content = 'test-token-789'
      document.head.appendChild(metaTag)

      await fetchWithCSRF('/api/test', { method: 'DELETE' })

      expect(mockFetch).toHaveBeenCalledWith('/api/test', {
        method: 'DELETE',
        headers: {
          'x-csrf-token': 'test-token-789'
        }
      })
    })

    it('should preserve existing headers when adding CSRF token', async () => {
      // Create a meta tag with token
      const metaTag = document.createElement('meta')
      metaTag.name = 'csrf-token'
      metaTag.content = 'test-token-123'
      document.head.appendChild(metaTag)

      await fetchWithCSRF('/api/test', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: 'Bearer token123'
        }
      })

      expect(mockFetch).toHaveBeenCalledWith('/api/test', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: 'Bearer token123',
          'x-csrf-token': 'test-token-123'
        }
      })
    })

    it('should not add CSRF token for POST requests when no token is available', async () => {
      await fetchWithCSRF('/api/test', { method: 'POST' })

      expect(mockFetch).toHaveBeenCalledWith('/api/test', {
        method: 'POST'
      })
    })

    it('should default to GET method when no method is specified', async () => {
      await fetchWithCSRF('/api/test')

      expect(mockFetch).toHaveBeenCalledWith('/api/test', {})
    })

    it('should return the fetch response', async () => {
      const mockResponse = new Response('test response', { status: 200 })
      mockFetch.mockResolvedValue(mockResponse)

      const response = await fetchWithCSRF('/api/test')

      expect(response).toBe(mockResponse)
    })

    it('should handle fetch errors', async () => {
      const mockError = new Error('Network error')
      mockFetch.mockRejectedValue(mockError)

      await expect(fetchWithCSRF('/api/test')).rejects.toThrow('Network error')
    })
  })
})
