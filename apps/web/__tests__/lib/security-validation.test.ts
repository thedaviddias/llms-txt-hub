/**
 * Tests for validation functionality in security-utils
 *
 * Critical validation functions for usernames, origins, and other inputs.
 */

import './security-utils-setup'
import { createSafeErrorMessage, validateOrigin, validateUsername } from '@/lib/security-utils'
import {
  createMockRequest,
  INVALID_USERNAMES,
  VALID_USERNAMES,
  XSS_ATTACK_VECTORS
} from './security-utils-setup'

describe('Input Validation', () => {
  describe('validateUsername', () => {
    it('validates correct usernames', () => {
      VALID_USERNAMES.forEach(username => {
        const result = validateUsername(username)
        expect(result.valid).toBe(true)
        expect(result.error).toBeUndefined()
      })
    })

    it('rejects empty usernames', () => {
      const result = validateUsername('')
      expect(result.valid).toBe(false)
      expect(result.error).toBe('Username is required')
    })

    it('rejects usernames that become empty after sanitization', () => {
      const result = validateUsername('<script></script>')
      expect(result.valid).toBe(false)
      expect(result.error).toBe('Username cannot be empty')
    })

    it('rejects usernames that are too short', () => {
      const result = validateUsername('ab')
      expect(result.valid).toBe(false)
      expect(result.error).toBe('Username must be at least 3 characters')
    })

    it('rejects usernames that are too long', () => {
      const longUsername = 'a'.repeat(31)
      const result = validateUsername(longUsername)
      expect(result.valid).toBe(false)
      expect(result.error).toBe('Username must be 30 characters or less')
    })

    it('rejects usernames with invalid characters', () => {
      INVALID_USERNAMES.forEach(username => {
        const result = validateUsername(username)
        expect(result.valid).toBe(false)
        expect(result.error).toBe(
          'Username can only contain letters, numbers, underscores, and hyphens'
        )
      })
    })

    it('rejects reserved usernames', () => {
      const reservedUsernames = ['admin', 'root', 'system', 'api', 'www', 'mail', 'ftp']

      reservedUsernames.forEach(username => {
        const result = validateUsername(username)
        expect(result.valid).toBe(false)
        expect(result.error).toBe('Username is reserved')
      })
    })

    it('is case-insensitive for reserved usernames', () => {
      const reservedVariations = ['ADMIN', 'Admin', 'ROOT', 'Root', 'API', 'Api']

      reservedVariations.forEach(username => {
        const result = validateUsername(username)
        expect(result.valid).toBe(false)
        expect(result.error).toBe('Username is reserved')
      })
    })

    it('handles XSS attempts in usernames', () => {
      XSS_ATTACK_VECTORS.forEach(vector => {
        const result = validateUsername(vector)
        expect(result.valid).toBe(false)
        // Should either be rejected as invalid chars or become empty after sanitization
        expect(result.error).toBeDefined()
      })
    })

    it('accepts usernames at exact length limits', () => {
      // Minimum length (3 characters)
      const minResult = validateUsername('abc')
      expect(minResult.valid).toBe(true)

      // Maximum length (30 characters)
      const maxUsername = 'a'.repeat(30)
      const maxResult = validateUsername(maxUsername)
      expect(maxResult.valid).toBe(true)
    })

    it('handles unicode characters appropriately', () => {
      const unicodeUsernames = ['user™', 'tëst', 'useñ123', '用户名']

      unicodeUsernames.forEach(username => {
        const result = validateUsername(username)
        // Should be rejected as they contain invalid characters
        expect(result.valid).toBe(false)
      })
    })
  })

  describe('validateOrigin', () => {
    it('validates allowed origins', () => {
      const allowedOrigins = ['https://example.com', 'https://app.example.com']
      const request = createMockRequest('https://example.com/api', {
        origin: 'https://example.com'
      })

      const result = validateOrigin(request, allowedOrigins)
      expect(result.valid).toBe(true)
    })

    it('rejects disallowed origins', () => {
      const allowedOrigins = ['https://example.com']
      const request = createMockRequest('https://example.com/api', {
        origin: 'https://evil.com'
      })

      const result = validateOrigin(request, allowedOrigins)
      expect(result.valid).toBe(false)
      expect(result.error).toBe('Origin not allowed')
    })

    it('rejects requests without origin header', () => {
      const allowedOrigins = ['https://example.com']
      const request = createMockRequest('https://example.com/api')

      const result = validateOrigin(request, allowedOrigins)
      expect(result.valid).toBe(false)
      expect(result.error).toBe('Origin header required')
    })

    it('handles case-sensitive origin matching', () => {
      const allowedOrigins = ['https://example.com']
      const request = createMockRequest('https://example.com/api', {
        origin: 'https://EXAMPLE.COM'
      })

      const result = validateOrigin(request, allowedOrigins)
      expect(result.valid).toBe(false)
    })

    it('validates exact subdomain matches', () => {
      const allowedOrigins = ['https://app.example.com']
      const request = createMockRequest('https://example.com/api', {
        origin: 'https://evil.app.example.com'
      })

      const result = validateOrigin(request, allowedOrigins)
      expect(result.valid).toBe(false)
    })

    it('handles multiple allowed origins', () => {
      const allowedOrigins = [
        'https://example.com',
        'https://app.example.com',
        'https://staging.example.com'
      ]

      allowedOrigins.forEach(origin => {
        const request = createMockRequest('https://example.com/api', { origin })
        const result = validateOrigin(request, allowedOrigins)
        expect(result.valid).toBe(true)
      })
    })

    it('rejects malformed origin headers', () => {
      const allowedOrigins = ['https://example.com']
      const malformedOrigins = ['not-a-url', 'example.com', '//example.com', 'javascript:alert(1)']

      malformedOrigins.forEach(origin => {
        const request = createMockRequest('https://example.com/api', { origin })
        const result = validateOrigin(request, allowedOrigins)
        expect(result.valid).toBe(false)
      })
    })
  })

  describe('createSafeErrorMessage', () => {
    it('creates safe error messages for common scenarios', () => {
      const testCases = [
        { input: new Error('Database connection failed'), expected: 'Database error occurred' },
        { input: new Error('User not found'), expected: 'User not found' },
        { input: new Error('Invalid token'), expected: 'Authentication error' },
        { input: new Error('Rate limit exceeded'), expected: 'Too many requests' }
      ]

      testCases.forEach(({ input, expected }) => {
        const result = createSafeErrorMessage(input)
        expect(result).toContain(expected)
      })
    })

    it('sanitizes sensitive information from error messages', () => {
      const sensitiveError = new Error(
        'Database error: password123 connection failed at host db.internal.com'
      )
      const result = createSafeErrorMessage(sensitiveError)

      expect(result).not.toContain('password123')
      expect(result).not.toContain('db.internal.com')
      expect(result).toContain('Database error occurred')
    })

    it('handles non-Error objects', () => {
      const stringError = 'Something went wrong'
      const result = createSafeErrorMessage(stringError as any)

      expect(typeof result).toBe('string')
      expect(result).toBeDefined()
    })

    it('handles null and undefined errors', () => {
      expect(createSafeErrorMessage(null as any)).toBe('An error occurred')
      expect(createSafeErrorMessage(undefined as any)).toBe('An error occurred')
    })

    it('removes stack traces from production errors', () => {
      const error = new Error('Test error')
      error.stack = 'Error: Test error\n    at /app/src/handlers.js:123:45'

      const result = createSafeErrorMessage(error, { includeStack: false })
      expect(result).not.toContain('/app/src/handlers.js')
      expect(result).not.toContain('123:45')
    })

    it('includes helpful context for known error patterns', () => {
      const testCases = [
        { error: new Error('ENOENT: no such file'), expected: 'File not found' },
        { error: new Error('ECONNREFUSED'), expected: 'Connection refused' },
        { error: new Error('Timeout of 5000ms exceeded'), expected: 'Request timeout' }
      ]

      testCases.forEach(({ error, expected }) => {
        const result = createSafeErrorMessage(error)
        expect(result).toContain(expected)
      })
    })
  })
})
