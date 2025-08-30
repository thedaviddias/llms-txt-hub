/**
 * Tests for fetch-metadata API route
 *
 * Tests metadata extraction, URL validation, duplicate detection, and sanitization.
 */

import { GET, POST } from '@/app/api/fetch-metadata/route'
import { getWebsites } from '@/lib/content-loader'
import * as cheerio from 'cheerio'
import DOMPurify from 'isomorphic-dompurify'

// Mock dependencies
jest.mock('@/lib/content-loader')
jest.mock('cheerio', () => ({
  load: jest.fn(() => {
    const $ = (_selector: string) => ({
      text: jest.fn().mockReturnValue('Test Title'),
      attr: jest.fn().mockReturnValue('Test content')
    })
    return $
  })
}))
jest.mock('isomorphic-dompurify')
jest.mock('@thedaviddias/logging', () => ({
  logger: {
    error: jest.fn()
  }
}))

// Mock fetch globally
global.fetch = jest.fn()

describe('Fetch Metadata API Route', () => {
  const mockFetch = global.fetch as jest.MockedFunction<typeof fetch>
  const mockGetWebsites = getWebsites as jest.MockedFunction<typeof getWebsites>
  const mockCheerioLoad = cheerio.load as jest.MockedFunction<typeof cheerio.load>
  const mockDOMPurify = DOMPurify.sanitize as jest.MockedFunction<typeof DOMPurify.sanitize>

  beforeEach(() => {
    jest.clearAllMocks()

    // Default mock implementations
    mockGetWebsites.mockReturnValue([])
    mockDOMPurify.mockImplementation((text: string | Node) => text as string)

    // Mock cheerio
    const mockCheerioInstance = {
      text: jest.fn().mockReturnValue('Test Title'),
      attr: jest.fn().mockReturnValue('Test content')
    }
    mockCheerioLoad.mockReturnValue(jest.fn().mockReturnValue(mockCheerioInstance) as any)

    // Mock successful fetch responses
    mockFetch.mockImplementation((url: string | Request | URL) => {
      const urlString = typeof url === 'string' ? url : url.toString()
      if (urlString.includes('llms.txt') || urlString.includes('llms-full.txt')) {
        return Promise.resolve({
          ok: true,
          status: 200
        } as Response)
      }
      return Promise.resolve({
        ok: true,
        status: 200,
        text: () => Promise.resolve('<html><title>Test Title</title></html>')
      } as Response)
    })
  })

  describe('GET Request', () => {
    it('returns 400 when domain is missing', async () => {
      const request = new Request('http://localhost/api/fetch-metadata')
      const response = await GET(request)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.error).toBe('Domain is required')
    })

    it('returns 400 for invalid URL format', async () => {
      const request = new Request('http://localhost/api/fetch-metadata?domain=not-a-url')
      const response = await GET(request)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.error).toBe('Invalid URL format')
    })

    it('blocks malicious URL protocols', async () => {
      const maliciousUrls = [
        'javascript:alert(1)',
        'data:text/html,<script>alert(1)</script>',
        'vbscript:msgbox'
      ]

      for (const url of maliciousUrls) {
        const request = new Request(
          `http://localhost/api/fetch-metadata?domain=${encodeURIComponent(url)}`
        )
        const response = await GET(request)
        const data = await response.json()

        expect(response.status).toBe(400)
        expect(data.error).toBe('Invalid URL protocol')
      }
    })

    it('successfully fetches metadata for valid URL', async () => {
      const request = new Request('http://localhost/api/fetch-metadata?domain=https://example.com')
      const response = await GET(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.metadata).toBeDefined()
      expect(data.metadata.name).toBeDefined()
      expect(data.metadata.website).toBe('https://example.com')
    })
  })

  describe('POST Request', () => {
    it('returns 400 when website is missing', async () => {
      const request = new Request('http://localhost/api/fetch-metadata', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({})
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.error).toBe('Website URL is required')
    })

    it('returns 400 when website is not a string', async () => {
      const request = new Request('http://localhost/api/fetch-metadata', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ website: 123 })
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.error).toBe('Website URL is required')
    })

    it('returns 400 for invalid URL format', async () => {
      const request = new Request('http://localhost/api/fetch-metadata', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ website: 'not-a-url' })
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.error).toBe('Invalid URL format')
    })

    it('blocks malicious URL protocols', async () => {
      const maliciousUrls = [
        'javascript:alert(1)',
        'data:text/html,<script>alert(1)</script>',
        'vbscript:msgbox'
      ]

      for (const url of maliciousUrls) {
        const request = new Request('http://localhost/api/fetch-metadata', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ website: url })
        })

        const response = await POST(request)
        const data = await response.json()

        expect(response.status).toBe(400)
        expect(data.error).toBe('Invalid URL protocol')
      }
    })

    it('successfully fetches metadata for valid URL', async () => {
      const request = new Request('http://localhost/api/fetch-metadata', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ website: 'https://example.com' })
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.metadata).toBeDefined()
      expect(data.metadata.name).toBeDefined()
      expect(data.metadata.website).toBe('https://example.com')
    })

    it('handles duplicate website detection', async () => {
      mockGetWebsites.mockReturnValue([
        {
          name: 'Existing Site',
          description: 'An existing website',
          website: 'https://example.com',
          category: 'Tools',
          slug: 'existing-site',
          llmsUrl: 'https://example.com/llms.txt',
          publishedAt: '2024-01-01'
        }
      ])

      const request = new Request('http://localhost/api/fetch-metadata', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ website: 'https://example.com' })
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.isDuplicate).toBe(true)
      expect(data.existingWebsite).toBeDefined()
    })

    it('handles fetch errors gracefully', async () => {
      mockFetch.mockRejectedValueOnce(new Error('Network error'))

      const request = new Request('http://localhost/api/fetch-metadata', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ website: 'https://example.com' })
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(500)
      expect(data.error).toBe('Failed to fetch metadata')
    })

    it('handles non-200 responses', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 404
      } as Response)

      const request = new Request('http://localhost/api/fetch-metadata', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ website: 'https://example.com' })
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(500)
      expect(data.error).toBe('Failed to fetch metadata')
    })

    it('sanitizes HTML content', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        text: () =>
          Promise.resolve('<html><title>Test Title<script>alert("xss")</script></title></html>')
      } as Response)

      const request = new Request('http://localhost/api/fetch-metadata', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ website: 'https://example.com' })
      })

      await POST(request)

      expect(mockDOMPurify).toHaveBeenCalled()
    })

    it('extracts metadata from HTML', async () => {
      const htmlContent = `
        <html>
          <head>
            <title>Test Website</title>
            <meta name="description" content="Test description">
            <meta property="og:title" content="OG Title">
            <meta property="og:description" content="OG Description">
            <meta property="og:image" content="https://example.com/og-image.jpg">
            <link rel="icon" href="https://example.com/favicon.ico">
          </head>
          <body>
            <h1>Test Website</h1>
          </body>
        </html>
      `

      // Mock cheerio to return the actual content from the HTML
      const mockCheerioInstance = {
        text: jest.fn().mockReturnValue('Test Website'),
        attr: jest.fn().mockImplementation((attr: string) => {
          if (attr === 'content') {
            return 'Test description'
          }
          return null
        })
      }
      mockCheerioLoad.mockReturnValueOnce(jest.fn().mockReturnValue(mockCheerioInstance) as any)

      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        text: () => Promise.resolve(htmlContent)
      } as Response)

      const request = new Request('http://localhost/api/fetch-metadata', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ website: 'https://example.com' })
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.metadata.name).toBe('Test Website')
      expect(data.metadata.description).toBe('Test description')
      expect(data.metadata.website).toBe('https://example.com')
    })

    it('handles missing metadata gracefully', async () => {
      const htmlContent = '<html><body><h1>No metadata</h1></body></html>'

      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        text: () => Promise.resolve(htmlContent)
      } as Response)

      const request = new Request('http://localhost/api/fetch-metadata', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ website: 'https://example.com' })
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.metadata.name).toBeDefined()
      expect(data.metadata.description).toBeDefined()
      expect(data.metadata.website).toBe('https://example.com')
    })

    it('handles cheerio load errors', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        text: () => Promise.resolve('<html><title>Test</title></html>')
      } as Response)

      mockCheerioLoad.mockImplementationOnce(() => {
        throw new Error('Cheerio load error')
      })

      const request = new Request('http://localhost/api/fetch-metadata', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ website: 'https://example.com' })
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(500)
      expect(data.error).toBe('Failed to fetch metadata')
    })

    it('handles DOMPurify errors', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        text: () => Promise.resolve('<html><title>Test</title></html>')
      } as Response)

      mockDOMPurify.mockImplementationOnce(() => {
        throw new Error('DOMPurify error')
      })

      const request = new Request('http://localhost/api/fetch-metadata', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ website: 'https://example.com' })
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(500)
      expect(data.error).toBe('Failed to fetch metadata')
    })
  })
})
