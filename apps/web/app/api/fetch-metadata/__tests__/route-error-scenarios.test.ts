/**
 * Tests for fetch-metadata API route error scenarios
 *
 * Tests the fixes for the 78% failure rate issue
 */

import { logger } from '@thedaviddias/logging'
import { GET, POST } from '@/app/api/fetch-metadata/route'
import { getWebsites } from '@/lib/content-loader'

// Mock dependencies
jest.mock('@/lib/content-loader')
jest.mock('@thedaviddias/logging', () => ({
  logger: {
    error: jest.fn(),
    debug: jest.fn()
  }
}))

// Mock fetch globally
global.fetch = jest.fn()

describe('Fetch Metadata Error Scenarios', () => {
  const mockFetch = global.fetch as jest.MockedFunction<typeof fetch>
  const mockGetWebsites = getWebsites as jest.MockedFunction<typeof getWebsites>
  const mockLogger = logger as jest.Mocked<typeof logger>

  beforeEach(() => {
    jest.clearAllMocks()
    mockGetWebsites.mockReturnValue([])
  })

  describe('Network Error Handling', () => {
    it('handles network errors gracefully', async () => {
      const networkError = new Error('Network error: Unable to connect')
      mockFetch.mockRejectedValueOnce(networkError)

      const request = new Request('http://localhost/api/fetch-metadata?domain=https://example.com')
      const response = await GET(request)
      const data = await response.json()

      expect(response.status).toBe(500)
      expect(data.error).toContain('Unable to reach website')
      expect(mockLogger.error).toHaveBeenCalledWith(
        'Failed to fetch website',
        expect.objectContaining({
          data: expect.objectContaining({
            url: 'https://example.com',
            error: 'Network error: Unable to connect'
          }),
          tags: expect.objectContaining({
            type: 'api',
            error_type: 'network_error'
          })
        })
      )
    })

    it('handles DNS resolution failures', async () => {
      const dnsError = new Error('getaddrinfo ENOTFOUND nonexistent.domain')
      mockFetch.mockRejectedValueOnce(dnsError)

      const request = new Request('http://localhost/api/fetch-metadata', {
        method: 'POST',
        body: JSON.stringify({ website: 'https://nonexistent.domain' })
      })
      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(500)
      expect(data.error).toContain('getaddrinfo ENOTFOUND')
      expect(mockLogger.error).toHaveBeenCalledWith('Failed to fetch website', expect.anything())
    })
  })

  describe('HTTP Error Handling', () => {
    it('handles 404 errors with proper message', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 404,
        statusText: 'Not Found'
      } as Response)

      const request = new Request('http://localhost/api/fetch-metadata?domain=https://example.com')
      const response = await GET(request)
      const data = await response.json()

      expect(response.status).toBe(500)
      expect(data.error).toBe('Website returned error: 404 Not Found')
      expect(mockLogger.error).toHaveBeenCalledWith(
        'Website returned error status',
        expect.objectContaining({
          data: expect.objectContaining({
            url: 'https://example.com',
            status: 404
          }),
          tags: expect.objectContaining({
            type: 'api',
            error_type: 'http_error'
          })
        })
      )
    })

    it('handles 500 errors from target website', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 500,
        statusText: 'Internal Server Error'
      } as Response)

      const request = new Request('http://localhost/api/fetch-metadata?domain=https://example.com')
      const response = await GET(request)
      const data = await response.json()

      expect(response.status).toBe(500)
      expect(data.error).toBe('Website returned error: 500 Internal Server Error')
    })

    it('handles 403 Forbidden errors', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 403,
        statusText: 'Forbidden'
      } as Response)

      const request = new Request('http://localhost/api/fetch-metadata?domain=https://example.com')
      const response = await GET(request)
      const data = await response.json()

      expect(response.status).toBe(500)
      expect(data.error).toBe('Website returned error: 403 Forbidden')
    })
  })

  describe('llms.txt File Handling', () => {
    it('continues when llms.txt does not exist (404)', async () => {
      // Main page succeeds
      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          status: 200,
          text: () => Promise.resolve('<html><title>Test Site</title></html>')
        } as Response)
        // llms.txt returns 404
        .mockResolvedValueOnce({
          ok: false,
          status: 404
        } as Response)
        // llms-full.txt returns 404
        .mockResolvedValueOnce({
          ok: false,
          status: 404
        } as Response)

      const request = new Request('http://localhost/api/fetch-metadata?domain=https://example.com')
      const response = await GET(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.metadata).toBeDefined()
      expect(data.metadata.llmsUrl).toBe('')
      expect(data.metadata.llmsFullUrl).toBe('')
      expect(mockLogger.debug).not.toHaveBeenCalled() // 404 is not an error, just means file doesn't exist
    })

    it('continues when llms.txt fetch fails with network error', async () => {
      // Main page succeeds
      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          status: 200,
          text: () => Promise.resolve('<html><title>Test Site</title></html>')
        } as Response)
        // llms.txt fetch throws error
        .mockRejectedValueOnce(new Error('Network timeout'))
        // llms-full.txt fetch throws error
        .mockRejectedValueOnce(new Error('Network timeout'))

      const request = new Request('http://localhost/api/fetch-metadata?domain=https://example.com')
      const response = await GET(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.metadata).toBeDefined()
      expect(data.metadata.llmsUrl).toBe('')
      expect(data.metadata.llmsFullUrl).toBe('')
      expect(mockLogger.debug).toHaveBeenCalledWith(
        'Could not check llms.txt',
        expect.objectContaining({
          data: expect.objectContaining({
            error: 'Network timeout'
          })
        })
      )
    })

    it('includes llms.txt URL when it exists', async () => {
      // Main page succeeds
      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          status: 200,
          text: () => Promise.resolve('<html><title>Test Site</title></html>')
        } as Response)
        // llms.txt exists
        .mockResolvedValueOnce({
          ok: true,
          status: 200
        } as Response)
        // llms-full.txt does not exist
        .mockResolvedValueOnce({
          ok: false,
          status: 404
        } as Response)

      const request = new Request('http://localhost/api/fetch-metadata?domain=https://example.com')
      const response = await GET(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.metadata).toBeDefined()
      expect(data.metadata.llmsUrl).toBe('https://example.com/llms.txt')
      expect(data.metadata.llmsFullUrl).toBe('')
    })

    it('includes both llms URLs when both exist', async () => {
      // Main page succeeds
      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          status: 200,
          text: () => Promise.resolve('<html><title>Test Site</title></html>')
        } as Response)
        // llms.txt exists
        .mockResolvedValueOnce({
          ok: true,
          status: 200
        } as Response)
        // llms-full.txt exists
        .mockResolvedValueOnce({
          ok: true,
          status: 200
        } as Response)

      const request = new Request('http://localhost/api/fetch-metadata?domain=https://example.com')
      const response = await GET(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.metadata).toBeDefined()
      expect(data.metadata.llmsUrl).toBe('https://example.com/llms.txt')
      expect(data.metadata.llmsFullUrl).toBe('https://example.com/llms-full.txt')
    })
  })

  describe('Response Body Parsing Errors', () => {
    it('handles malformed HTML response', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        text: () => Promise.reject(new Error('Invalid encoding'))
      } as Response)

      const request = new Request('http://localhost/api/fetch-metadata?domain=https://example.com')
      const response = await GET(request)
      const data = await response.json()

      expect(response.status).toBe(500)
      expect(data.error).toBe('Failed to read website content')
      expect(mockLogger.error).toHaveBeenCalledWith(
        'Failed to read response body',
        expect.objectContaining({
          data: expect.objectContaining({
            error: 'Invalid encoding'
          }),
          tags: expect.objectContaining({
            type: 'api',
            error_type: 'parse_error'
          })
        })
      )
    })
  })

  describe('User-Agent Header', () => {
    it('includes User-Agent header in all requests', async () => {
      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          status: 200,
          text: () => Promise.resolve('<html><title>Test</title></html>')
        } as Response)
        .mockResolvedValueOnce({ ok: false, status: 404 } as Response)
        .mockResolvedValueOnce({ ok: false, status: 404 } as Response)

      const request = new Request('http://localhost/api/fetch-metadata?domain=https://example.com')
      await GET(request)

      // Check all three fetch calls include User-Agent
      expect(mockFetch).toHaveBeenCalledTimes(3)

      // Main page fetch
      expect(mockFetch).toHaveBeenNthCalledWith(1, 'https://example.com', {
        headers: {
          'User-Agent': 'llmstxthub/1.0 (https://llmstxthub.com)'
        }
      })

      // llms.txt fetch
      expect(mockFetch).toHaveBeenNthCalledWith(2, 'https://example.com/llms.txt', {
        headers: {
          'User-Agent': 'llmstxthub/1.0 (https://llmstxthub.com)'
        }
      })

      // llms-full.txt fetch
      expect(mockFetch).toHaveBeenNthCalledWith(3, 'https://example.com/llms-full.txt', {
        headers: {
          'User-Agent': 'llmstxthub/1.0 (https://llmstxthub.com)'
        }
      })
    })
  })

  describe('Error Message Propagation', () => {
    it('returns specific error messages to client', async () => {
      const specificError = new Error('Connection refused: ECONNREFUSED')
      mockFetch.mockRejectedValueOnce(specificError)

      const request = new Request('http://localhost/api/fetch-metadata?domain=https://example.com')
      const response = await GET(request)
      const data = await response.json()

      expect(response.status).toBe(500)
      expect(data.error).toBe('Unable to reach website: Connection refused: ECONNREFUSED')
      expect(mockLogger.error).toHaveBeenCalledWith(
        'GET /api/fetch-metadata error',
        expect.objectContaining({
          data: expect.objectContaining({
            domain: 'https://example.com',
            error: 'Unable to reach website: Connection refused: ECONNREFUSED'
          })
        })
      )
    })

    it('handles non-Error objects thrown', async () => {
      mockFetch.mockRejectedValueOnce('String error')

      const request = new Request('http://localhost/api/fetch-metadata?domain=https://example.com')
      const response = await GET(request)
      const data = await response.json()

      expect(response.status).toBe(500)
      expect(data.error).toBe('Unable to reach website: Network error')
    })
  })
})
