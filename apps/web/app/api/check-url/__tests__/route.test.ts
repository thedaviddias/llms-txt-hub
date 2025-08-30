/**
 * Tests for check-url API route
 *
 * Tests URL validation, rate limiting, security checks, and error handling.
 */

import { testApiHandler } from 'next-test-api-route-handler'
import * as appHandler from '@/app/api/check-url/route'

// Ensure fetch is available globally for tests
if (!global.fetch) {
  global.fetch = jest.fn()
}

describe.skip('Check URL API Route', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  describe('Request Validation', () => {
    it('returns 400 when URL is missing', async () => {
      await testApiHandler({
        appHandler,
        test: async ({ fetch }) => {
          const response = await fetch({
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({})
          })

          const data = await response.json()

          expect(response.status).toBe(400)
          expect(data.accessible).toBe(false)
          expect(data.error).toBe('URL is required')
        }
      })
    })

    it('returns 400 when URL is not a string', async () => {
      await testApiHandler({
        appHandler,
        test: async ({ fetch }) => {
          const response = await fetch({
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ url: 123 })
          })

          const data = await response.json()

          expect(response.status).toBe(400)
          expect(data.accessible).toBe(false)
          expect(data.error).toBe('URL is required')
        }
      })
    })

    it('returns 400 for invalid URL format', async () => {
      await testApiHandler({
        appHandler,
        test: async ({ fetch }) => {
          const response = await fetch({
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ url: 'not-a-valid-url' })
          })

          const data = await response.json()

          expect(response.status).toBe(400)
          expect(data.accessible).toBe(false)
          expect(data.error).toBe('Invalid URL format')
        }
      })
    })
  })

  describe('Security Checks', () => {
    const dangerousProtocols = [
      'javascript:alert(1)',
      'data:text/html,<script>alert(1)</script>',
      'vbscript:msgbox',
      'file:///etc/passwd'
    ]

    dangerousProtocols.forEach(url => {
      it(`blocks dangerous protocol: ${url.split(':')[0]}`, async () => {
        await testApiHandler({
          appHandler,
          test: async ({ fetch }) => {
            const response = await fetch({
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ url })
            })

            const data = await response.json()

            expect(response.status).toBe(400)
            expect(data.accessible).toBe(false)
            expect(data.error).toBe('Invalid URL protocol detected')
          }
        })
      })
    })

    it('blocks non-HTTP/HTTPS protocols', async () => {
      await testApiHandler({
        appHandler,
        test: async ({ fetch }) => {
          const response = await fetch({
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ url: 'ftp://example.com' })
          })

          const data = await response.json()

          expect(response.status).toBe(400)
          expect(data.accessible).toBe(false)
          expect(data.error).toBe('Only HTTP and HTTPS URLs are allowed')
        }
      })
    })
  })

  describe('URL Accessibility Checks', () => {
    it('returns accessible true for successful HEAD request', async () => {
      // Mock the global fetch for the route handler
      const originalFetch = global.fetch
      global.fetch = jest.fn().mockResolvedValueOnce({
        ok: true,
        status: 200,
        statusText: 'OK'
      } as Response)

      await testApiHandler({
        appHandler,
        test: async ({ fetch }) => {
          const response = await fetch({
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ url: 'https://example.com' })
          })

          const data = await response.json()

          expect(response.status).toBe(200)
          expect(data.accessible).toBe(true)
          expect(data.status).toBe(200)
          expect(data.statusText).toBe('OK')
          expect(data.error).toBeNull()

          // Verify HEAD request was made
          expect(global.fetch).toHaveBeenCalledWith(
            'https://example.com',
            expect.objectContaining({
              method: 'HEAD',
              redirect: 'manual'
            })
          )

          // Restore fetch
          global.fetch = originalFetch
        }
      })
    })

    it('returns accessible false for 404 response', async () => {
      const originalFetch = global.fetch
      global.fetch = jest.fn().mockResolvedValueOnce({
        ok: false,
        status: 404,
        statusText: 'Not Found'
      } as Response)

      await testApiHandler({
        appHandler,
        test: async ({ fetch }) => {
          const response = await fetch({
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ url: 'https://example.com/not-found' })
          })

          const data = await response.json()

          expect(response.status).toBe(200)
          expect(data.accessible).toBe(false)
          expect(data.status).toBe(404)
          expect(data.error).toBe('HTTP 404: Not Found')

          global.fetch = originalFetch
        }
      })
    })

    it('handles network errors gracefully', async () => {
      const originalFetch = global.fetch
      global.fetch = jest.fn().mockRejectedValueOnce(new Error('Network error'))

      await testApiHandler({
        appHandler,
        test: async ({ fetch }) => {
          const response = await fetch({
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ url: 'https://unreachable.com' })
          })

          const data = await response.json()

          expect(response.status).toBe(200)
          expect(data.accessible).toBe(false)
          expect(data.error).toBe('Network error')

          global.fetch = originalFetch
        }
      })
    })

    it('handles timeout errors', async () => {
      const originalFetch = global.fetch
      const timeoutError = new Error('Request timed out')
      timeoutError.name = 'TimeoutError'
      global.fetch = jest.fn().mockRejectedValueOnce(timeoutError)

      await testApiHandler({
        appHandler,
        test: async ({ fetch }) => {
          const response = await fetch({
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ url: 'https://slow-site.com' })
          })

          const data = await response.json()

          expect(response.status).toBe(200)
          expect(data.accessible).toBe(false)
          expect(data.error).toBe('Request timed out')

          global.fetch = originalFetch
        }
      })
    })
  })

  describe('Rate Limiting', () => {
    it('enforces rate limiting after max requests', async () => {
      await testApiHandler({
        appHandler,
        test: async ({ fetch }) => {
          const ip = '192.168.1.1'

          // Make 10 requests (the limit)
          for (let i = 0; i < 10; i++) {
            const response = await fetch({
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'x-forwarded-for': ip
              },
              body: JSON.stringify({ url: 'https://example.com' })
            })
            expect(response.status).toBe(200)
          }

          // 11th request should be rate limited
          const response = await fetch({
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'x-forwarded-for': ip
            },
            body: JSON.stringify({ url: 'https://example.com' })
          })

          const data = await response.json()

          expect(response.status).toBe(429)
          expect(data.error).toBe('Rate limit exceeded. Please try again later.')
          expect(response.headers.get('Retry-After')).toBeDefined()
          expect(response.headers.get('X-RateLimit-Remaining')).toBe('0')
        }
      })
    })

    it('uses different rate limit keys for different IPs', async () => {
      await testApiHandler({
        appHandler,
        test: async ({ fetch }) => {
          // First IP can make requests
          const response1 = await fetch({
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'x-forwarded-for': '192.168.1.1'
            },
            body: JSON.stringify({ url: 'https://example.com' })
          })

          // Different IP can also make requests
          const response2 = await fetch({
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'x-forwarded-for': '192.168.1.2'
            },
            body: JSON.stringify({ url: 'https://example.com' })
          })

          expect(response1.status).toBe(200)
          expect(response2.status).toBe(200)
        }
      })
    })
  })

  describe('Error Handling', () => {
    it('handles malformed JSON gracefully', async () => {
      await testApiHandler({
        appHandler,
        test: async ({ fetch }) => {
          const response = await fetch({
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: 'invalid json'
          })

          const data = await response.json()

          expect(response.status).toBe(500)
          expect(data.accessible).toBe(false)
          expect(data.error).toBe('Internal server error')
        }
      })
    })

    it('logs errors to console in production', async () => {
      const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation()

      await testApiHandler({
        appHandler,
        test: async ({ fetch }) => {
          const response = await fetch({
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: 'invalid json'
          })

          await response.json()

          expect(consoleErrorSpy).toHaveBeenCalledWith('URL check error:', expect.any(Error))
        }
      })

      consoleErrorSpy.mockRestore()
    })
  })
})
