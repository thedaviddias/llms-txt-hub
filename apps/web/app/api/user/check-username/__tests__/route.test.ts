/**
 * Tests for check-username API route
 *
 * Tests username validation, availability checking, authentication, and rate limiting.
 */

// Mock dependencies BEFORE imports
jest.mock('@thedaviddias/auth')
jest.mock('isomorphic-dompurify')
jest.mock('@thedaviddias/logging', () => ({
  logger: {
    error: jest.fn()
  }
}))

// Mock Clerk with proper client structure
jest.mock('@clerk/backend', () => {
  const mockUsers = {
    getUser: jest.fn(),
    getUserList: jest.fn()
  }

  return {
    createClerkClient: jest.fn(() => ({
      users: mockUsers
    })),
    __mockUsers: mockUsers // Export for test access
  }
})

import { auth } from '@thedaviddias/auth'
import DOMPurify from 'isomorphic-dompurify'
import { MALICIOUS_INPUTS } from '@/app/api/__tests__/test-helpers'
// Import route AFTER mocks are set up
import { POST } from '@/app/api/user/check-username/route'
import { clearRateLimiting } from '@/lib/security-utils'

// Mock environment variable for Clerk
process.env.CLERK_SECRET_KEY = 'test_secret_key'

/**
 * Helper to clear the route's internal rate limiting
 *
 * @returns void
 */
const clearRouteRateLimit = () => {
  // Access the rate limit map from the module
  jest.resetModules()
}

describe('Check Username API Route', () => {
  const mockAuth = auth as jest.MockedFunction<typeof auth>
  const mockDOMPurify = DOMPurify.sanitize as jest.MockedFunction<typeof DOMPurify.sanitize>

  // Get the mock users from the mocked module
  const mockClerkModule = jest.requireMock('@clerk/backend')
  const mockClerkUsers = mockClerkModule.__mockUsers

  beforeEach(() => {
    jest.clearAllMocks()
    clearRateLimiting() // Clear rate limiting between tests

    // Setup Clerk mocks
    mockClerkUsers.getUser.mockResolvedValue({
      id: 'test-user-id',
      username: 'currentuser',
      email: 'test@example.com'
    })

    mockClerkUsers.getUserList.mockResolvedValue({
      data: [],
      totalCount: 0
    })

    // Setup default mocks
    mockAuth.mockResolvedValue({
      user: {
        id: 'test-user-id',
        email: 'test@example.com',
        user_metadata: {
          user_name: null,
          full_name: null,
          avatar_url: null
        }
      },
      provider_token: undefined
    })

    mockDOMPurify.mockImplementation((text: string | Node) => text as string)
  })

  describe('Authentication', () => {
    it('returns 401 when user is not authenticated', async () => {
      mockAuth.mockResolvedValueOnce(null)

      const request = new Request('http://localhost/api/user/check-username', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: 'testuser' })
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(401)
      expect(data.error).toBe('Unauthorized')
    })

    it('returns 401 when user session lacks ID', async () => {
      mockAuth.mockResolvedValueOnce({
        user: {
          id: '',
          email: 'test@example.com',
          user_metadata: {
            user_name: null,
            full_name: null,
            avatar_url: null
          }
        },
        provider_token: undefined
      })

      const request = new Request('http://localhost/api/user/check-username', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: 'testuser' })
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(401)
      expect(data.error).toBe('Unauthorized')
    })
  })

  describe('Request Validation', () => {
    it('returns 400 when username is missing', async () => {
      const request = new Request('http://localhost/api/user/check-username', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({})
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.error).toBe('Username is required')
    })

    it('returns 400 when username is not a string', async () => {
      const request = new Request('http://localhost/api/user/check-username', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: 123 })
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.error).toBe('Username is required')
    })

    it('returns error for username shorter than 3 characters', async () => {
      const request = new Request('http://localhost/api/user/check-username', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: 'ab' })
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.available).toBe(false)
      expect(data.error).toBe('Username must be at least 3 characters')
    })

    it('returns error for username longer than 30 characters', async () => {
      const request = new Request('http://localhost/api/user/check-username', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: 'a'.repeat(31) })
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.available).toBe(false)
      expect(data.error).toBe('Username must be 30 characters or less')
    })

    it('returns error for username with invalid characters', async () => {
      const invalidUsernames = ['user@name', 'user name', 'user.name', 'user!name', 'user#name']

      for (const username of invalidUsernames) {
        const request = new Request('http://localhost/api/user/check-username', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ username })
        })

        const response = await POST(request)
        const data = await response.json()

        expect(response.status).toBe(200)
        expect(data.available).toBe(false)
        expect(data.error).toBe(
          'Username can only contain letters, numbers, underscores, and hyphens'
        )
      }
    })

    it('accepts valid username formats', async () => {
      const validUsernames = ['username', 'user_name', 'user-name', 'User123', 'USER_NAME_123']

      for (const username of validUsernames) {
        const request = new Request('http://localhost/api/user/check-username', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ username })
        })

        const response = await POST(request)
        const data = await response.json()

        if (response.status !== 200) {
          console.error('Test failed for username:', username)
          console.error('Response data:', data)
        }

        expect(response.status).toBe(200)
        expect(data.available).toBe(true)
      }
    })
  })

  describe('Username Availability', () => {
    it('returns available true for unused username', async () => {
      mockClerkUsers.getUserList.mockResolvedValueOnce({
        data: []
      })

      const request = new Request('http://localhost/api/user/check-username', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: 'newusername' })
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.available).toBe(true)
      expect(mockClerkUsers.getUserList).toHaveBeenCalledWith({
        username: ['newusername'],
        limit: 1
      })
    })

    it('returns available false for taken username', async () => {
      mockClerkUsers.getUserList.mockResolvedValueOnce({
        data: [{ id: 'other-user', username: 'takenusername' }]
      })

      const request = new Request('http://localhost/api/user/check-username', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: 'takenusername' })
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.available).toBe(false)
    })

    it('returns available true when checking own username', async () => {
      mockClerkUsers.getUser.mockResolvedValueOnce({
        id: 'test-user-id',
        username: 'myusername'
      })

      const request = new Request('http://localhost/api/user/check-username', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: 'myusername' })
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.available).toBe(true)
      // Should not query getUserList for own username
      expect(mockClerkUsers.getUserList).not.toHaveBeenCalled()
    })

    it('handles case-insensitive username checking', async () => {
      mockClerkUsers.getUserList.mockResolvedValueOnce({
        data: []
      })

      const request = new Request('http://localhost/api/user/check-username', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: 'UserName' })
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      // Should check lowercase version
      expect(mockClerkUsers.getUserList).toHaveBeenCalledWith({
        username: ['username'],
        limit: 1
      })
    })
  })

  describe('Security', () => {
    it('sanitizes username input to prevent XSS', async () => {
      mockDOMPurify.mockImplementationOnce(() => 'sanitized')

      const request = new Request('http://localhost/api/user/check-username', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: '<script>alert(1)</script>' })
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.error).toBe('Invalid characters in username')
      expect(mockDOMPurify).toHaveBeenCalled()
    })

    it('rejects malicious input patterns', async () => {
      for (const maliciousInput of MALICIOUS_INPUTS.xss) {
        const request = new Request('http://localhost/api/user/check-username', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ username: maliciousInput })
        })

        const response = await POST(request)

        expect(response.status).toBeGreaterThanOrEqual(200)
        expect(response.status).toBeLessThan(500)
      }
    })
  })

  describe('Rate Limiting', () => {
    it('enforces rate limiting after max requests', async () => {
      // Use a unique user ID for this test to avoid conflicts
      mockAuth.mockResolvedValue({
        user: {
          id: 'rate-limit-test-user',
          email: 'rate-limit@example.com',
          user_metadata: {
            user_name: null,
            full_name: null,
            avatar_url: null
          }
        },
        provider_token: undefined
      })

      // Make 20 requests (the limit)
      for (let i = 0; i < 20; i++) {
        const request = new Request('http://localhost/api/user/check-username', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ username: `username${i}` })
        })

        const response = await POST(request)
        if (response.status !== 200) {
          console.error(`Request ${i + 1} failed with status ${response.status}`)
        }
        expect(response.status).toBe(200)
      }

      // 21st request should be rate limited
      const rateLimitedRequest = new Request('http://localhost/api/user/check-username', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: 'anotheruser' })
      })

      const response = await POST(rateLimitedRequest as any)
      const data = await response.json()

      expect(response.status).toBe(429)
      expect(data.error).toBe('Too many requests. Please try again later.')
    })

    it('applies rate limiting per user', async () => {
      // First user makes requests
      mockAuth.mockResolvedValue({
        user: {
          id: 'user-1',
          email: 'user1@example.com',
          user_metadata: {
            user_name: null,
            full_name: null,
            avatar_url: null
          }
        },
        provider_token: undefined
      })

      const request1 = new Request('http://localhost/api/user/check-username', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: 'username1' })
      })

      const response1 = await POST(request1)
      expect(response1.status).toBe(200)

      // Different user can also make requests
      mockAuth.mockResolvedValue({
        user: {
          id: 'user-2',
          email: 'user2@example.com',
          user_metadata: {
            user_name: null,
            full_name: null,
            avatar_url: null
          }
        },
        provider_token: undefined
      })

      const request2 = new Request('http://localhost/api/user/check-username', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: 'username2' })
      })

      const response2 = await POST(request2)
      expect(response2.status).toBe(200)
    })
  })

  describe('Error Handling', () => {
    it('handles Clerk API errors gracefully', async () => {
      // Use unique user ID to avoid rate limiting
      mockAuth.mockResolvedValue({
        user: {
          id: 'error-test-user-1',
          email: 'error1@example.com',
          user_metadata: {
            user_name: null,
            full_name: null,
            avatar_url: null
          }
        },
        provider_token: undefined
      })

      mockClerkUsers.getUserList.mockRejectedValueOnce(new Error('Clerk API error'))

      const request = new Request('http://localhost/api/user/check-username', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: 'testuser' })
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.available).toBe(false)
      expect(data.error).toBe('Unable to check username availability')
    })

    it('handles malformed JSON gracefully', async () => {
      // Use unique user ID to avoid rate limiting
      mockAuth.mockResolvedValue({
        user: {
          id: 'error-test-user-2',
          email: 'error2@example.com',
          user_metadata: {
            user_name: null,
            full_name: null,
            avatar_url: null
          }
        },
        provider_token: undefined
      })

      const request = new Request('http://localhost/api/user/check-username', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: 'invalid json'
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(500)
      expect(data.error).toBe('Failed to check username')
    })

    it('handles unexpected errors', async () => {
      mockAuth.mockRejectedValueOnce(new Error('Unexpected error'))

      const request = new Request('http://localhost/api/user/check-username', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: 'testuser' })
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(500)
      expect(data.error).toBe('Failed to check username')
    })
  })
})
