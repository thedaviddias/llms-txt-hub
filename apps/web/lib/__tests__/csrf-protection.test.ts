/**
 * @jest-environment jsdom
 */

import {
  createCSRFToken,
  enforceCSRFProtection,
  extractCSRFTokenFromRequest,
  generateCSRFToken,
  getStoredCSRFToken,
  validateCSRFToken
} from '../csrf-protection'

// Mock crypto.timingSafeEqual for consistent test behavior
jest.mock('node:crypto', () => ({
  ...jest.requireActual('node:crypto'),
  timingSafeEqual: jest.fn((a, b) => a.toString() === b.toString())
}))

// Mock dependencies
jest.mock('next/headers')
jest.mock('@thedaviddias/logging')
jest.mock('@/lib/server-crypto')

const mockCookies = {
  get: jest.fn(),
  set: jest.fn()
}

// Mock the cookies function
const mockCookiesFunction = jest.fn().mockResolvedValue(mockCookies)
require('next/headers').cookies = mockCookiesFunction

// Mock logger
const mockLogger = {
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn()
}
require('@thedaviddias/logging').logger = mockLogger

// Mock hashSensitiveData
const mockHashSensitiveData = jest.fn().mockReturnValue('hashed-data')
require('@/lib/server-crypto').hashSensitiveData = mockHashSensitiveData

describe('csrf-protection', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  describe('generateCSRFToken', () => {
    it('should generate a random hex token', () => {
      const token = generateCSRFToken()
      expect(typeof token).toBe('string')
      expect(token.length).toBe(64) // 32 bytes = 64 hex chars
      expect(token).toMatch(/^[a-f0-9]{64}$/i)
    })

    it('should generate different tokens on subsequent calls', () => {
      const token1 = generateCSRFToken()
      const token2 = generateCSRFToken()
      expect(token1).not.toBe(token2)
    })
  })

  describe('createCSRFToken', () => {
    it('should create and store a CSRF token', async () => {
      const token = await createCSRFToken()

      expect(typeof token).toBe('string')
      expect(token.length).toBe(64)
      expect(mockCookies.set).toHaveBeenCalledWith(
        'csrf_token',
        expect.stringContaining(token),
        expect.objectContaining({
          httpOnly: true,
          secure: false, // NODE_ENV is test
          sameSite: 'strict',
          maxAge: expect.any(Number),
          path: '/'
        })
      )
      expect(mockLogger.info).toHaveBeenCalledWith(
        'CSRF token created',
        expect.objectContaining({
          data: expect.objectContaining({
            tokenHash: 'hashed-data',
            expiresAt: expect.any(String)
          })
        })
      )
    })

    it('should set secure flag in production', async () => {
      const originalEnv = process.env.NODE_ENV
      process.env.NODE_ENV = 'production'

      try {
        await createCSRFToken()

        expect(mockCookies.set).toHaveBeenCalledWith(
          'csrf_token',
          expect.any(String),
          expect.objectContaining({
            secure: true
          })
        )
      } finally {
        process.env.NODE_ENV = originalEnv
      }
    })
  })

  describe('getStoredCSRFToken', () => {
    it('should return null when no cookie exists', async () => {
      mockCookies.get.mockReturnValue(undefined)

      const result = await getStoredCSRFToken()

      expect(result).toBeNull()
    })

    it('should return null when cookie has no value', async () => {
      mockCookies.get.mockReturnValue({ value: '' })

      const result = await getStoredCSRFToken()

      expect(result).toBeNull()
    })

    it('should return token data when valid cookie exists', async () => {
      const tokenData = {
        token: 'test-token-123',
        expiresAt: Date.now() + 60000 // 1 minute from now
      }
      mockCookies.get.mockReturnValue({ value: JSON.stringify(tokenData) })

      const result = await getStoredCSRFToken()

      expect(result).toEqual(tokenData)
    })

    it('should return null when token is expired', async () => {
      const tokenData = {
        token: 'test-token-123',
        expiresAt: Date.now() - 60000 // 1 minute ago
      }
      mockCookies.get.mockReturnValue({ value: JSON.stringify(tokenData) })

      const result = await getStoredCSRFToken()

      expect(result).toBeNull()
      expect(mockLogger.warn).toHaveBeenCalledWith('CSRF token expired', expect.any(Object))
    })

    it('should handle malformed JSON gracefully', async () => {
      mockCookies.get.mockReturnValue({ value: 'invalid-json' })

      const result = await getStoredCSRFToken()

      expect(result).toBeNull()
      expect(mockLogger.error).toHaveBeenCalledWith(
        'Failed to parse CSRF token',
        expect.any(Object)
      )
    })
  })

  describe('extractCSRFTokenFromRequest', () => {
    it('should extract token from header', () => {
      const request = new Request('http://localhost/api/test', {
        method: 'POST',
        headers: { 'x-csrf-token': 'header-token-123' }
      })

      const token = extractCSRFTokenFromRequest(request)

      expect(token).toBe('header-token-123')
    })

    it('should extract token from query parameters', () => {
      const request = new Request('http://localhost/api/test?_csrf=query-token-456', {
        method: 'POST'
      })

      const token = extractCSRFTokenFromRequest(request)

      expect(token).toBe('query-token-456')
    })

    it('should prefer header over query parameter', () => {
      const request = new Request('http://localhost/api/test?_csrf=query-token', {
        method: 'POST',
        headers: { 'x-csrf-token': 'header-token' }
      })

      const token = extractCSRFTokenFromRequest(request)

      expect(token).toBe('header-token')
    })

    it('should return null when no token is found', () => {
      const request = new Request('http://localhost/api/test', {
        method: 'POST'
      })

      const token = extractCSRFTokenFromRequest(request)

      expect(token).toBeNull()
    })
  })

  describe('validateCSRFToken', () => {
    it('should return true for safe HTTP methods', async () => {
      const getRequest = new Request('http://localhost/api/test', { method: 'GET' })
      const headRequest = new Request('http://localhost/api/test', { method: 'HEAD' })
      const optionsRequest = new Request('http://localhost/api/test', { method: 'OPTIONS' })

      expect(await validateCSRFToken(getRequest)).toBe(true)
      expect(await validateCSRFToken(headRequest)).toBe(true)
      expect(await validateCSRFToken(optionsRequest)).toBe(true)
    })

    it('should return true for Bearer token authentication', async () => {
      const request = new Request('http://localhost/api/test', {
        method: 'POST',
        headers: { Authorization: 'Bearer some-token' }
      })

      const result = await validateCSRFToken(request)

      expect(result).toBe(true)
    })

    it('should return false when no stored token exists', async () => {
      mockCookies.get.mockReturnValue(undefined)

      const request = new Request('http://localhost/api/test', {
        method: 'POST',
        headers: { 'x-csrf-token': 'request-token' }
      })

      const result = await validateCSRFToken(request)

      expect(result).toBe(false)
      expect(mockLogger.warn).toHaveBeenCalledWith(
        'No CSRF token found in storage',
        expect.any(Object)
      )
    })

    it('should return false when no request token exists', async () => {
      const tokenData = {
        token: 'stored-token',
        expiresAt: Date.now() + 60000
      }
      mockCookies.get.mockReturnValue({ value: JSON.stringify(tokenData) })

      const request = new Request('http://localhost/api/test', {
        method: 'POST'
      })

      const result = await validateCSRFToken(request)

      expect(result).toBe(false)
      expect(mockLogger.warn).toHaveBeenCalledWith(
        'No CSRF token found in request',
        expect.any(Object)
      )
    })

    it('should return true when tokens match', async () => {
      const token = 'matching-token-123'
      const tokenData = {
        token,
        expiresAt: Date.now() + 60000
      }
      mockCookies.get.mockReturnValue({ value: JSON.stringify(tokenData) })

      const request = new Request('http://localhost/api/test', {
        method: 'POST',
        headers: { 'x-csrf-token': token }
      })

      const result = await validateCSRFToken(request)

      expect(result).toBe(true)
      expect(mockLogger.info).toHaveBeenCalledWith(
        'CSRF token validated successfully',
        expect.any(Object)
      )
    })

    it('should return false when tokens do not match', async () => {
      const tokenData = {
        token: 'stored-token-123456789',
        expiresAt: Date.now() + 60000
      }
      mockCookies.get.mockReturnValue({ value: JSON.stringify(tokenData) })

      const request = new Request('http://localhost/api/test', {
        method: 'POST',
        headers: { 'x-csrf-token': 'different-token-987654321' }
      })

      const result = await validateCSRFToken(request)

      expect(result).toBe(false)
      expect(mockLogger.warn).toHaveBeenCalledWith(
        'CSRF token validation failed',
        expect.any(Object)
      )
    })

    it('should handle validation errors gracefully', async () => {
      // Mock cookies to throw an error
      mockCookies.get.mockImplementation(() => {
        throw new Error('Cookie access failed')
      })

      const request = new Request('http://localhost/api/test', {
        method: 'POST',
        headers: { 'x-csrf-token': 'some-token' }
      })

      const result = await validateCSRFToken(request)

      expect(result).toBe(false)
      // The error is logged in getStoredCSRFToken, not validateCSRFToken
      expect(mockLogger.error).toHaveBeenCalledWith(
        'Failed to parse CSRF token',
        expect.any(Object)
      )
    })
  })

  describe('enforceCSRFProtection', () => {
    it('should return null when validation passes', async () => {
      // Mock successful validation
      const token = 'valid-token-123'
      const tokenData = {
        token,
        expiresAt: Date.now() + 60000
      }
      mockCookies.get.mockReturnValue({ value: JSON.stringify(tokenData) })

      const request = new Request('http://localhost/api/test', {
        method: 'POST',
        headers: { 'x-csrf-token': token }
      })

      const result = await enforceCSRFProtection(request)

      expect(result).toBeNull()
    })

    it('should return 403 response when validation fails', async () => {
      mockCookies.get.mockReturnValue(undefined)

      const request = new Request('http://localhost/api/test', {
        method: 'POST'
      })

      const result = await enforceCSRFProtection(request)

      expect(result).toBeInstanceOf(Response)
      expect(result?.status).toBe(403)

      const body = await result?.json()
      expect(body).toEqual({
        error: 'Invalid or missing CSRF token',
        code: 'CSRF_VALIDATION_FAILED'
      })

      expect(result?.headers.get('Content-Type')).toBe('application/json')
      expect(result?.headers.get('X-CSRF-Error')).toBe('true')
    })
  })
})
