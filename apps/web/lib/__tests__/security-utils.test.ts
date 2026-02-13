import {
  checkRateLimit,
  createSafeErrorMessage,
  escapeHtml,
  sanitizeText,
  sanitizeUrl,
  validateOrigin,
  validateUsername
} from '../security-utils'

// Mock the helpers module
jest.mock('../security-utils-helpers', () => {
  const actual = jest.requireActual('../security-utils-helpers')
  const mockRateLimitMap = new Map()

  return {
    rateLimitMap: mockRateLimitMap,
    sanitizeErrorMessage: jest.fn(msg => msg),
    escapeHtml: actual.escapeHtml,
    clearRateLimiting: jest.fn(() => mockRateLimitMap.clear()),
    getRateLimitKey: jest.fn((ip, action) => `${ip}:${action}`),
    checkRateLimit: jest.fn(({ identifier, windowMs = 60000, maxRequests = 10 }) => {
      const now = Date.now()
      const record = mockRateLimitMap.get(identifier)

      if (!record || now > record.resetTime) {
        const resetTime = now + windowMs
        mockRateLimitMap.set(identifier, { count: 1, resetTime })
        return { allowed: true, resetTime }
      }

      if (record.count < maxRequests) {
        record.count++
        return { allowed: true, resetTime: record.resetTime }
      }

      return { allowed: false, resetTime: record.resetTime }
    })
  }
})

const { rateLimitMap, sanitizeErrorMessage } = require('../security-utils-helpers')

describe('security-utils', () => {
  beforeEach(() => {
    rateLimitMap.clear()
    jest.clearAllMocks()
  })

  describe('checkRateLimit', () => {
    it('should allow first request', () => {
      const result = checkRateLimit({ identifier: 'test-key' })

      expect(result.allowed).toBe(true)
      expect(result.resetTime).toBeDefined()
      expect(typeof result.resetTime).toBe('number')
    })

    it('should allow requests within limit', () => {
      const identifier = 'test-key'
      const options = { windowMs: 60000, maxRequests: 3 }

      const result1 = checkRateLimit({ identifier, ...options })
      const result2 = checkRateLimit({ identifier, ...options })
      const result3 = checkRateLimit({ identifier, ...options })

      expect(result1.allowed).toBe(true)
      expect(result2.allowed).toBe(true)
      expect(result3.allowed).toBe(true)
    })

    it('should deny requests over limit', () => {
      const identifier = 'test-key'
      const options = { windowMs: 60000, maxRequests: 2 }

      checkRateLimit({ identifier, ...options })
      checkRateLimit({ identifier, ...options })
      const result = checkRateLimit({ identifier, ...options })

      expect(result.allowed).toBe(false)
      expect(result.resetTime).toBeDefined()
      expect(typeof result.resetTime).toBe('number')
    })

    it('should reset after time window', () => {
      const identifier = 'test-key'
      const options = { windowMs: 1, maxRequests: 1 }

      // First request should be allowed
      const result1 = checkRateLimit({ identifier, ...options })
      expect(result1.allowed).toBe(true)

      // Wait for window to expire
      setTimeout(() => {
        const result2 = checkRateLimit({ identifier, ...options })
        expect(result2.allowed).toBe(true)
      }, 10)
    })

    it('should handle different keys independently', () => {
      const options = { windowMs: 60000, maxRequests: 1 }

      const result1 = checkRateLimit({ identifier: 'key1', ...options })
      const result2 = checkRateLimit({ identifier: 'key2', ...options })

      expect(result1.allowed).toBe(true)
      expect(result2.allowed).toBe(true)
    })

    it('should use default options when none provided', () => {
      const result = checkRateLimit({ identifier: 'test-key' })
      expect(result.allowed).toBe(true)

      // Should use default maxRequests of 10
      for (let i = 0; i < 9; i++) {
        checkRateLimit({ identifier: 'test-key' })
      }

      const finalResult = checkRateLimit({ identifier: 'test-key' })
      expect(finalResult.allowed).toBe(false)
    })
  })

  describe('sanitizeText', () => {
    it('should return null for null input', () => {
      expect(sanitizeText(null)).toBe(null)
    })

    it('should return null for undefined input', () => {
      expect(sanitizeText(undefined)).toBe(null)
    })

    it('should return empty string for empty input', () => {
      expect(sanitizeText('')).toBe('')
    })

    it('should preserve safe text', () => {
      expect(sanitizeText('Hello World')).toBe('Hello World')
    })

    it('should allow safe HTML tags', () => {
      expect(sanitizeText('Hello <strong>world</strong>')).toContain('<strong>world</strong>')
      expect(sanitizeText('Text with <em>emphasis</em>')).toContain('<em>emphasis</em>')
      expect(sanitizeText('Paragraph<br>break')).toContain('<br>')
    })

    it('should remove dangerous HTML tags', () => {
      const result = sanitizeText('<script>alert("xss")</script>Safe text')
      expect(result).toBe('Safe text')
      expect(result).not.toContain('<script>')
    })

    it('should remove event handlers', () => {
      const result = sanitizeText('<div onclick="alert()">Click me</div>')
      expect(result).not.toContain('onclick')
      expect(result).not.toContain('alert()')
    })

    it('should remove zero-width characters', () => {
      const textWithZeroWidth = 'Hello\u200BWorld\u200C\u200D\uFEFF'
      const result = sanitizeText(textWithZeroWidth)
      expect(result).toBe('HelloWorld')
    })

    it('should trim whitespace', () => {
      expect(sanitizeText('  Hello World  ')).toBe('Hello World')
    })

    it('should handle complex XSS attempts', () => {
      const xssAttempts = [
        { input: '<img src="x" onerror="alert(1)">', shouldNotContain: ['onerror'] },
        { input: '<svg onload="alert(1)">', shouldNotContain: ['onload'] },
        { input: '<iframe src="javascript:alert(1)"></iframe>', shouldNotContain: ['<iframe'] },
        { input: '<object data="javascript:alert(1)"></object>', shouldNotContain: ['<object'] }
      ]

      xssAttempts.forEach(({ input, shouldNotContain }) => {
        const result = sanitizeText(input)
        shouldNotContain.forEach(forbidden => {
          expect(result).not.toContain(forbidden)
        })
      })

      // Note: javascript: URLs may remain as text content but won't execute
      const jsResult = sanitizeText('javascript:alert(1)')
      expect(jsResult).toBe('javascript:alert(1)') // This is safe as plain text
    })
  })

  describe('sanitizeUrl', () => {
    it('should return null for null/undefined input', () => {
      expect(sanitizeUrl(null)).toBe(null)
      expect(sanitizeUrl(undefined)).toBe(null)
      expect(sanitizeUrl('')).toBe(null)
    })

    it('should accept valid HTTP URLs', () => {
      expect(sanitizeUrl('http://example.com')).toBe('http://example.com')
    })

    it('should accept valid HTTPS URLs', () => {
      expect(sanitizeUrl('https://example.com')).toBe('https://example.com')
    })

    it('should accept URLs with query parameters', () => {
      expect(sanitizeUrl('https://example.com?foo=bar&baz=qux')).toBe(
        'https://example.com?foo=bar&baz=qux'
      )
    })

    it('should accept URLs with fragments', () => {
      expect(sanitizeUrl('https://example.com#section')).toBe('https://example.com#section')
    })

    it('should trim whitespace', () => {
      expect(sanitizeUrl('  https://example.com  ')).toBe('https://example.com')
    })

    it('should reject javascript: URLs', () => {
      expect(() => sanitizeUrl('javascript:alert("xss")')).toThrow('Invalid URL format')
    })

    it('should reject data: URLs', () => {
      expect(() => sanitizeUrl('data:text/html,<script>alert("xss")</script>')).toThrow(
        'Invalid URL format'
      )
    })

    it('should reject vbscript: URLs', () => {
      expect(() => sanitizeUrl('vbscript:msgbox("xss")')).toThrow('Invalid URL format')
    })

    it('should reject file: URLs', () => {
      expect(() => sanitizeUrl('file:///etc/passwd')).toThrow('Invalid URL format')
    })

    it('should reject invalid URL formats', () => {
      expect(() => sanitizeUrl('not-a-url')).toThrow('Invalid URL format')
      expect(() => sanitizeUrl('ftp://example.com')).toThrow('Invalid URL format')
      expect(() => sanitizeUrl('example.com')).toThrow('Invalid URL format')
    })

    it('should handle case-insensitive protocol checks', () => {
      expect(() => sanitizeUrl('JAVASCRIPT:alert("xss")')).toThrow('Invalid URL format')
      expect(() => sanitizeUrl('JavaScript:alert("xss")')).toThrow('Invalid URL format')
    })
  })

  describe('validateUsername', () => {
    it('should reject empty username', () => {
      const result = validateUsername('')
      expect(result.valid).toBe(false)
      expect(result.error).toBe('Username is required')
    })

    it('should reject username that becomes empty after sanitization', () => {
      const result = validateUsername('<script></script>')
      expect(result.valid).toBe(false)
      expect(result.error).toBe('Username cannot be empty')
    })

    it('should reject username shorter than 3 characters', () => {
      const result = validateUsername('ab')
      expect(result.valid).toBe(false)
      expect(result.error).toBe('Username must be at least 3 characters')
    })

    it('should reject username longer than 30 characters', () => {
      const longUsername = 'a'.repeat(31)
      const result = validateUsername(longUsername)
      expect(result.valid).toBe(false)
      expect(result.error).toBe('Username must be 30 characters or less')
    })

    it('should accept valid usernames', () => {
      const validUsernames = ['user123', 'test_user', 'my-username', 'User1']
      validUsernames.forEach(username => {
        const result = validateUsername(username)
        expect(result.valid).toBe(true)
        expect(result.error).toBeUndefined()
      })
    })

    it('should reject usernames with invalid characters', () => {
      const invalidUsernames = ['user@name', 'user name', 'user.name', 'user$name', 'user#name']
      invalidUsernames.forEach(username => {
        const result = validateUsername(username)
        expect(result.valid).toBe(false)
        expect(result.error).toBe(
          'Username can only contain letters, numbers, underscores, and hyphens'
        )
      })
    })

    it('should reject reserved usernames', () => {
      const reservedUsernames = ['admin', 'api', 'root', 'system', 'support', 'help', 'www']
      reservedUsernames.forEach(username => {
        const result = validateUsername(username)
        expect(result.valid).toBe(false)
        expect(result.error).toBe('Username is reserved')
      })
    })

    it('should reject reserved usernames case-insensitively', () => {
      const result1 = validateUsername('ADMIN')
      const result2 = validateUsername('Admin')
      expect(result1.valid).toBe(false)
      expect(result2.valid).toBe(false)
      expect(result1.error).toBe('Username is reserved')
      expect(result2.error).toBe('Username is reserved')
    })
  })

  describe('createSafeErrorMessage', () => {
    beforeEach(() => {
      sanitizeErrorMessage.mockImplementation((msg: string) => msg)
    })

    it('should handle null/undefined errors', () => {
      expect(createSafeErrorMessage(null)).toBe('An error occurred')
      expect(createSafeErrorMessage(undefined)).toBe('An error occurred')
    })

    it('should handle string errors', () => {
      expect(createSafeErrorMessage('Simple error')).toBe('Simple error')
    })

    it('should handle Error objects', () => {
      const error = new Error('Test error message')
      expect(createSafeErrorMessage(error)).toBe('Test error message')
    })

    it('should map database connection errors', () => {
      const error = new Error('Database connection failed')
      expect(createSafeErrorMessage(error)).toBe('Database error occurred')
    })

    it('should map user not found errors', () => {
      const error = new Error('User not found in database')
      expect(createSafeErrorMessage(error)).toBe('User not found')
    })

    it('should map authentication errors', () => {
      const error = new Error('Invalid token provided')
      expect(createSafeErrorMessage(error)).toBe('Authentication error')
    })

    it('should map rate limit errors', () => {
      const error = new Error('Rate limit exceeded for user')
      expect(createSafeErrorMessage(error)).toBe('Too many requests')
    })

    it('should handle file not found errors', () => {
      const error = new Error('ENOENT: no such file or directory')
      expect(createSafeErrorMessage(error)).toBe('File not found')
    })

    it('should handle connection refused errors', () => {
      const error = new Error('ECONNREFUSED to server')
      expect(createSafeErrorMessage(error)).toBe('Connection refused')
    })

    it('should handle timeout errors', () => {
      const error = new Error('Timeout exceeded for request')
      expect(createSafeErrorMessage(error)).toBe('Request timeout')
    })

    it('should use fallback message when sanitization returns null', () => {
      sanitizeErrorMessage.mockReturnValue(null)
      const error = new Error('Sensitive information')
      expect(createSafeErrorMessage(error)).toBe('An error occurred')
    })

    it('should handle custom fallback message (legacy API)', () => {
      expect(createSafeErrorMessage(null, 'Custom fallback')).toBe('Custom fallback')
    })

    it('should handle non-Error objects', () => {
      expect(createSafeErrorMessage({ message: 'object error' })).toBe('An error occurred')
      expect(createSafeErrorMessage(123)).toBe('An error occurred')
      expect(createSafeErrorMessage(true)).toBe('An error occurred')
    })
  })

  describe('escapeHtml', () => {
    it('should handle null/undefined input', () => {
      expect(escapeHtml(null)).toBe('')
      expect(escapeHtml(undefined)).toBe('')
    })

    it('should handle number input', () => {
      expect(escapeHtml(123)).toBe('123')
      expect(escapeHtml(0)).toBe('0')
    })

    it('should handle non-string input', () => {
      expect(escapeHtml(true as any)).toBe('')
      expect(escapeHtml({} as any)).toBe('')
      expect(escapeHtml([] as any)).toBe('')
    })

    it('should escape basic HTML entities', () => {
      expect(escapeHtml('<script>alert("xss")</script>')).toBe(
        '&lt;script&gt;alert(&quot;xss&quot;)&lt;&#x2F;script&gt;'
      )
      expect(escapeHtml('Tom & Jerry')).toBe('Tom &amp; Jerry')
      expect(escapeHtml("Single 'quotes'")).toBe('Single &#x27;quotes&#x27;')
    })

    it('should escape closing script tags specifically', () => {
      expect(escapeHtml('</script>')).toBe('&lt;&#x2F;script&gt;')
      expect(escapeHtml('</SCRIPT>')).toBe('&lt;&#x2F;script&gt;')
      expect(escapeHtml('</ScRiPt>')).toBe('&lt;&#x2F;script&gt;')
    })

    it('should handle complex XSS attempts', () => {
      const xssAttempts = [
        '<img src="x" onerror="alert(1)">',
        '<svg onload="alert(1)">',
        '<iframe src="javascript:alert(1)"></iframe>',
        '"><script>alert(1)</script>'
      ]

      xssAttempts.forEach(xss => {
        const result = escapeHtml(xss)
        expect(result).not.toContain('<script>')
        expect(result).not.toContain('<img')
        expect(result).not.toContain('<svg')
        expect(result).not.toContain('<iframe')
        expect(result).toContain('&lt;')
        expect(result).toContain('&gt;')
      })
    })
  })

  describe('validateOrigin', () => {
    /**
     * Creates a mock request object for testing
     *
     * @param origin - Origin header value
     * @param host - Host header value (default: 'example.com')
     * @returns Mock request object
     */
    const createMockRequest = (origin: string | null, host: string | null = 'example.com') =>
      ({
        headers: {
          get: jest.fn((header: string) => {
            if (header === 'origin') return origin
            if (header === 'host') return host
            return null
          })
        }
      }) as any

    it('should reject requests without origin header', () => {
      const request = createMockRequest(null)
      const result = validateOrigin(request)

      expect(result.valid).toBe(false)
      expect(result.error).toBe('Origin header required')
    })

    it('should accept origin that matches host', () => {
      const request = createMockRequest('https://example.com', 'example.com')
      const result = validateOrigin(request)

      expect(result.valid).toBe(true)
      expect(result.error).toBeUndefined()
    })

    it('should reject origin that does not match host', () => {
      const request = createMockRequest('https://malicious.com', 'example.com')
      const result = validateOrigin(request)

      expect(result.valid).toBe(false)
      expect(result.error).toBe('Origin does not match host')
    })

    it('should accept origins in allowed list', () => {
      const request = createMockRequest('https://trusted.com')
      const result = validateOrigin(request, ['https://trusted.com', 'https://example.com'])

      expect(result.valid).toBe(true)
      expect(result.error).toBeUndefined()
    })

    it('should reject origins not in allowed list', () => {
      const request = createMockRequest('https://malicious.com')
      const result = validateOrigin(request, ['https://trusted.com'])

      expect(result.valid).toBe(false)
      expect(result.error).toBe('Origin not allowed')
    })

    it('should handle missing host header', () => {
      const request = createMockRequest('https://example.com', null)
      const result = validateOrigin(request)

      expect(result.valid).toBe(false)
      expect(result.error).toBe('Host header missing')
    })

    it('should handle invalid origin URLs', () => {
      const request = createMockRequest('not-a-valid-url', 'example.com')
      const result = validateOrigin(request)

      expect(result.valid).toBe(false)
      expect(result.error).toBe('Invalid origin URL')
    })
  })
})
