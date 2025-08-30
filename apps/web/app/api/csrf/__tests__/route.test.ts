import { generateCSRFToken } from '@/lib/csrf-protection'

// Mock dependencies that are causing issues in the test environment
jest.mock('next/headers', () => ({
  cookies: jest.fn().mockResolvedValue({
    set: jest.fn()
  })
}))

jest.mock('@thedaviddias/logging', () => ({
  logger: {
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn()
  }
}))

jest.mock('@/lib/server-crypto', () => ({
  hashSensitiveData: jest.fn().mockReturnValue('hashed-data')
}))

describe('/api/csrf', () => {
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

  describe('CSRF API route behavior', () => {
    it('should have the correct route structure', async () => {
      // Import the route handler
      const { GET } = await import('@/app/api/csrf/route')

      // Verify it's a function
      expect(typeof GET).toBe('function')

      // The route should handle GET requests
      expect(GET.name).toBe('GET')
    })
  })
})
