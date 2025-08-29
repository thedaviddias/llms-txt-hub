/**
 * Tests for fetch-metadata API route
 *
 * Tests metadata extraction, URL validation, duplicate detection, and sanitization.
 */

import * as cheerio from 'cheerio'
import DOMPurify from 'isomorphic-dompurify'
import { GET, POST } from '@/app/api/fetch-metadata/route'
import { getWebsites } from '@/lib/content-loader'

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
    mockGetWebsites.mockResolvedValue([])
    mockDOMPurify.mockImplementation(text => text)

    // Mock cheerio
    const mockCheerioInstance = {
      text: jest.fn().mockReturnValue('Test Title'),
      attr: jest.fn().mockReturnValue('Test content')
    }
    mockCheerioLoad.mockReturnValue(jest.fn().mockReturnValue(mockCheerioInstance))

    // Mock successful fetch responses
    mockFetch.mockImplementation(url => {
      if (url.includes('llms.txt') || url.includes('llms-full.txt')) {
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

    it('validates URL format properly', async () => {
      const request = new Request('http://localhost/api/fetch-metadata', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ website: 'not-a-valid-url' })
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.error).toBe('Invalid URL format')
    })

    it('blocks dangerous protocols', async () => {
      const dangerousUrls = [
        'javascript:void(0)',
        'data:text/html,<h1>Test</h1>',
        'vbscript:alert(1)'
      ]

      for (const url of dangerousUrls) {
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
  })

  describe('Duplicate Detection', () => {
    it('detects duplicate websites', async () => {
      mockGetWebsites.mockResolvedValueOnce([
        {
          name: 'Existing Site',
          description: 'Description',
          website: 'https://example.com',
          categories: [],
          tags: []
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

    it('normalizes URLs for duplicate detection', async () => {
      mockGetWebsites.mockResolvedValueOnce([
        {
          name: 'Existing Site',
          description: 'Description',
          website: 'https://www.example.com/',
          categories: [],
          tags: []
        }
      ])

      // Different format but same site
      const request = new Request('http://localhost/api/fetch-metadata', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ website: 'https://example.com' })
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.isDuplicate).toBe(true)
    })

    it('detects subdomain duplicates', async () => {
      mockGetWebsites.mockResolvedValueOnce([
        {
          name: 'Main Site',
          description: 'Description',
          website: 'https://example.com',
          categories: [],
          tags: []
        }
      ])

      const request = new Request('http://localhost/api/fetch-metadata', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ website: 'https://example.com/subpath' })
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.isDuplicate).toBe(true)
    })
  })

  describe('Metadata Extraction', () => {
    it('extracts title from HTML', async () => {
      const mockHtml = '<html><head><title>My Website Title</title></head></html>'
      mockFetch.mockImplementationOnce(() =>
        Promise.resolve({
          ok: true,
          text: () => Promise.resolve(mockHtml)
        } as Response)
      )

      const _$ = cheerio.load(mockHtml)
      mockCheerioLoad.mockReturnValueOnce(
        () =>
          ({
            text: jest.fn().mockReturnValue('My Website Title'),
            attr: jest.fn().mockReturnValue('')
          }) as any
      )

      const request = new Request('http://localhost/api/fetch-metadata', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ website: 'https://example.com' })
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.metadata.name).toContain('My Website Title')
    })

    it('sanitizes extracted metadata', async () => {
      const maliciousHtml = '<html><title><script>alert(1)</script>Title</title></html>'
      mockFetch.mockImplementationOnce(() =>
        Promise.resolve({
          ok: true,
          text: () => Promise.resolve(maliciousHtml)
        } as Response)
      )

      mockDOMPurify.mockImplementationOnce(() => 'Title') // Sanitized output

      const request = new Request('http://localhost/api/fetch-metadata', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ website: 'https://example.com' })
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(mockDOMPurify).toHaveBeenCalled()
      expect(data.metadata.name).not.toContain('<script>')
    })

    it('limits metadata field lengths', async () => {
      const longTitle = 'A'.repeat(300)
      const longDescription = 'B'.repeat(600)

      mockCheerioLoad.mockReturnValueOnce(
        () =>
          ({
            text: jest.fn().mockReturnValue(longTitle),
            attr: jest.fn().mockImplementation(attr => {
              if (attr === 'content') return longDescription
              return ''
            })
          }) as any
      )

      const request = new Request('http://localhost/api/fetch-metadata', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ website: 'https://example.com' })
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.metadata.name.length).toBeLessThanOrEqual(200)
      expect(data.metadata.description.length).toBeLessThanOrEqual(500)
    })

    it('checks for llms.txt and llms-full.txt', async () => {
      const request = new Request('http://localhost/api/fetch-metadata', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ website: 'https://example.com' })
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(mockFetch).toHaveBeenCalledWith('https://example.com/llms.txt')
      expect(mockFetch).toHaveBeenCalledWith('https://example.com/llms-full.txt')
      expect(data.metadata.llmsUrl).toBe('https://example.com/llms.txt')
      expect(data.metadata.llmsFullUrl).toBe('https://example.com/llms-full.txt')
    })

    it('handles missing llms files gracefully', async () => {
      mockFetch.mockImplementation(url => {
        if (url.includes('llms')) {
          return Promise.resolve({ ok: false, status: 404 } as Response)
        }
        return Promise.resolve({
          ok: true,
          text: () => Promise.resolve('<html><title>Test</title></html>')
        } as Response)
      })

      const request = new Request('http://localhost/api/fetch-metadata', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ website: 'https://example.com' })
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.metadata.llmsUrl).toBe('')
      expect(data.metadata.llmsFullUrl).toBe('')
    })
  })

  describe('Error Handling', () => {
    it('handles fetch errors gracefully', async () => {
      mockFetch.mockRejectedValueOnce(new Error('Network error'))

      const request = new Request('http://localhost/api/fetch-metadata', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ website: 'https://unreachable.com' })
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(500)
      expect(data.error).toBe('Failed to fetch metadata')
    })

    it('handles malformed HTML gracefully', async () => {
      mockFetch.mockImplementationOnce(() =>
        Promise.resolve({
          ok: true,
          text: () => Promise.resolve('not valid html at all')
        } as Response)
      )

      mockCheerioLoad.mockImplementationOnce(() => {
        throw new Error('Parse error')
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

    it('handles invalid JSON in POST request', async () => {
      const request = new Request('http://localhost/api/fetch-metadata', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: 'invalid json'
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(500)
      expect(data.error).toBe('Failed to fetch metadata')
    })
  })
})
