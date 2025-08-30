/**
 * Tests for rate limiting functionality in security-utils
 *
 * Critical rate limiting functions that protect against abuse.
 */

import './security-utils-setup'
import { checkRateLimit, getRateLimitKey } from '@/lib/security-utils'
import { createMockRequest } from './security-utils-setup'

describe('Rate Limiting', () => {
  beforeEach(() => {
    jest.useFakeTimers()
  })

  afterEach(() => {
    jest.useRealTimers()
  })

  describe('checkRateLimit', () => {
    it('allows first request', () => {
      const result = checkRateLimit({ identifier: 'test-key' })
      expect(result.allowed).toBe(true)
      expect(result.resetTime).toBeUndefined()
    })

    it('allows requests within limit', () => {
      const identifier = 'test-key-within-limit'
      const options = { windowMs: 60000, maxRequests: 3 }

      for (let i = 0; i < 3; i++) {
        const result = checkRateLimit({ identifier, ...options })
        expect(result.allowed).toBe(true)
      }
    })

    it('blocks requests exceeding limit', () => {
      const identifier = 'test-key-exceeding-limit'
      const options = { windowMs: 60000, maxRequests: 2 }

      checkRateLimit({ identifier, ...options }) // 1st request
      checkRateLimit({ identifier, ...options }) // 2nd request

      const result = checkRateLimit({ identifier, ...options }) // 3rd request (should be blocked)
      expect(result.allowed).toBe(false)
      expect(result.resetTime).toBeDefined()
    })

    it('resets limit after time window', () => {
      const identifier = 'test-key-reset'
      const options = { windowMs: 1000, maxRequests: 1 }

      checkRateLimit({ identifier, ...options }) // 1st request
      const blockedResult = checkRateLimit({ identifier, ...options }) // 2nd request (blocked)
      expect(blockedResult.allowed).toBe(false)

      // Advance time past the window
      jest.advanceTimersByTime(1001)

      const allowedResult = checkRateLimit({ identifier, ...options }) // Should be allowed now
      expect(allowedResult.allowed).toBe(true)
    })

    it('handles different keys independently', () => {
      const options = { windowMs: 60000, maxRequests: 1 }

      const result1 = checkRateLimit({ identifier: 'key1', ...options })
      const result2 = checkRateLimit({ identifier: 'key2', ...options })

      expect(result1.allowed).toBe(true)
      expect(result2.allowed).toBe(true)
    })

    it('uses correct default options', () => {
      const identifier = 'test-defaults'

      // Should allow default number of requests (10)
      for (let i = 0; i < 10; i++) {
        const result = checkRateLimit({ identifier })
        expect(result.allowed).toBe(true)
      }

      // 11th request should be blocked
      const result = checkRateLimit({ identifier })
      expect(result.allowed).toBe(false)
    })

    it('handles concurrent requests correctly', () => {
      const identifier = 'test-concurrent'
      const options = { windowMs: 60000, maxRequests: 2 }

      // Simulate concurrent requests
      const results = Array.from({ length: 5 }, () => checkRateLimit({ identifier, ...options }))

      const allowedCount = results.filter(r => r.allowed).length
      const blockedCount = results.filter(r => !r.allowed).length

      expect(allowedCount).toBe(2)
      expect(blockedCount).toBe(3)
    })
  })

  describe('getRateLimitKey', () => {
    it('creates key from IP address', () => {
      const request = createMockRequest({
        url: 'https://example.com',
        headers: {
          'x-forwarded-for': '192.168.1.1'
        }
      })

      const key = getRateLimitKey(request)
      expect(key).toBe('ratelimit:192.168.1.1')
    })

    it('falls back to x-real-ip header', () => {
      const request = createMockRequest({
        url: 'https://example.com',
        headers: {
          'x-real-ip': '10.0.0.1'
        }
      })

      const key = getRateLimitKey(request)
      expect(key).toBe('ratelimit:10.0.0.1')
    })

    it('uses default IP when headers missing', () => {
      const request = createMockRequest({ url: 'https://example.com' })

      const key = getRateLimitKey(request)
      expect(key).toBe('ratelimit:unknown')
    })

    it('prefers x-forwarded-for over x-real-ip', () => {
      const request = createMockRequest({
        url: 'https://example.com',
        headers: {
          'x-forwarded-for': '192.168.1.1',
          'x-real-ip': '10.0.0.1'
        }
      })

      const key = getRateLimitKey(request)
      expect(key).toBe('ratelimit:192.168.1.1')
    })

    it('handles multiple IPs in x-forwarded-for', () => {
      const request = createMockRequest({
        url: 'https://example.com',
        headers: {
          'x-forwarded-for': '192.168.1.1, 10.0.0.1, 127.0.0.1'
        }
      })

      const key = getRateLimitKey(request)
      expect(key).toBe('ratelimit:192.168.1.1')
    })

    it('trims whitespace from IP addresses', () => {
      const request = createMockRequest({
        url: 'https://example.com',
        headers: {
          'x-forwarded-for': '  192.168.1.1  '
        }
      })

      const key = getRateLimitKey(request)
      expect(key).toBe('ratelimit:192.168.1.1')
    })
  })
})
