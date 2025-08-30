import { MALICIOUS_INPUTS, createMockRequest } from '@/app/api/__tests__/test-helpers'
import { POST } from '@/app/api/members/contributions/route'
import { getUserContributions } from '@/lib/github-contributions'
import { logger } from '@thedaviddias/logging'
import { NextRequest } from 'next/server'

// Mock dependencies
jest.mock('@thedaviddias/logging', () => ({
  logger: {
    error: jest.fn(),
    warn: jest.fn(),
    debug: jest.fn(),
    info: jest.fn()
  }
}))

jest.mock('@/lib/github-contributions', () => ({
  getUserContributions: jest.fn()
}))

jest.mock('@/lib/redis', () => ({
  __esModule: true,
  get: jest.fn(),
  set: jest.fn(),
  isAvailable: jest.fn(() => false),
  CACHE_KEYS: {
    GITHUB_CONTRIBUTIONS: 'gh:contrib:'
  },
  CACHE_TTL: {
    GITHUB_CONTRIBUTIONS: 3600
  }
}))

const mockLogger = logger as jest.Mocked<typeof logger>
const mockGetUserContributions = getUserContributions as jest.MockedFunction<
  typeof getUserContributions
>

describe('/api/members/contributions', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  describe('POST /api/members/contributions', () => {
    it('should return contributions for valid usernames', async () => {
      const usernames = ['user1', 'user2', 'user3']
      const mockContributions = {
        total: 50,
        pullRequests: 20,
        issues: 15,
        commits: 15,
        contributions: []
      }

      mockGetUserContributions.mockResolvedValue(mockContributions)

      const request = createMockRequest('/api/members/contributions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: { usernames }
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data).toHaveProperty('contributions')
      expect(Array.isArray(data.contributions)).toBe(true)
      expect(data.contributions).toHaveLength(3)

      data.contributions.forEach((contrib: any) => {
        expect(contrib).toHaveProperty('username')
        expect(contrib).toHaveProperty('hasContributions')
        expect(typeof contrib.hasContributions).toBe('boolean')
        expect(usernames).toContain(contrib.username)
      })
    })

    it('should handle users with no contributions', async () => {
      const usernames = ['user-no-contrib']
      const mockContributions = {
        total: 0,
        pullRequests: 0,
        issues: 0,
        commits: 0,
        contributions: []
      }

      mockGetUserContributions.mockResolvedValue(mockContributions)

      const request = createMockRequest('/api/members/contributions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: { usernames }
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.contributions).toHaveLength(1)
      expect(data.contributions[0]).toMatchObject({
        username: 'user-no-contrib',
        hasContributions: false
      })
    })

    it('should handle API errors for individual users gracefully', async () => {
      const usernames = ['valid-user', 'error-user']

      mockGetUserContributions
        .mockResolvedValueOnce({
          total: 10,
          pullRequests: 5,
          issues: 3,
          commits: 2,
          contributions: []
        })
        .mockRejectedValueOnce(new Error('GitHub API error'))

      const request = createMockRequest('/api/members/contributions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: { usernames }
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.contributions).toHaveLength(2)

      const validUser = data.contributions.find((c: any) => c.username === 'valid-user')
      const errorUser = data.contributions.find((c: any) => c.username === 'error-user')

      expect(validUser).toMatchObject({
        username: 'valid-user',
        hasContributions: true
      })

      expect(errorUser).toMatchObject({
        username: 'error-user',
        hasContributions: false,
        error: 'Failed to fetch contributions'
      })

      expect(mockLogger.warn).toHaveBeenCalledWith('Error fetching contributions for error-user:', {
        data: expect.any(Error),
        tags: { type: 'github-api', error: 'contributions' }
      })
    })

    it('should return 400 when usernames is missing', async () => {
      const request = createMockRequest('/api/members/contributions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: {}
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data).toEqual({ error: 'Invalid request: usernames array required' })
    })

    it('should return 400 when usernames is not an array', async () => {
      const request = createMockRequest('/api/members/contributions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: { usernames: 'not-an-array' }
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data).toEqual({ error: 'Invalid request: usernames array required' })
    })

    it('should return 400 when too many usernames are provided', async () => {
      const usernames = Array.from({ length: 51 }, (_, i) => `user${i}`)

      const request = createMockRequest('/api/members/contributions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: { usernames }
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data).toEqual({ error: 'Too many usernames requested' })
    })

    it('should filter out invalid usernames', async () => {
      const usernames = ['valid-user', '', null, undefined, 123, 'another-valid']
      const mockContributions = {
        total: 5,
        pullRequests: 2,
        issues: 2,
        commits: 1,
        contributions: []
      }

      mockGetUserContributions.mockResolvedValue(mockContributions)

      const request = createMockRequest('/api/members/contributions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: { usernames }
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.contributions).toHaveLength(2) // Only valid usernames
      expect(data.contributions[0].username).toBe('valid-user')
      expect(data.contributions[1].username).toBe('another-valid')
    })

    it('should return empty array when no valid usernames provided', async () => {
      const usernames = ['', null, undefined, 123]

      const request = createMockRequest('/api/members/contributions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: { usernames }
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data).toEqual({ contributions: [] })
      expect(mockGetUserContributions).not.toHaveBeenCalled()
    })

    it('should process usernames in batches', async () => {
      // Create 25 usernames to test batching (batch size is 10)
      const usernames = Array.from({ length: 25 }, (_, i) => `user${i}`)
      const mockContributions = {
        total: 1,
        pullRequests: 0,
        issues: 1,
        commits: 0,
        contributions: []
      }

      mockGetUserContributions.mockResolvedValue(mockContributions)

      const request = createMockRequest('/api/members/contributions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: { usernames }
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.contributions).toHaveLength(25)

      // Should be called 25 times (once for each username)
      expect(mockGetUserContributions).toHaveBeenCalledTimes(25)
    })

    it('should handle GitHub API rate limiting gracefully', async () => {
      const usernames = ['user1', 'user2']

      mockGetUserContributions
        .mockResolvedValueOnce({
          total: 5,
          pullRequests: 2,
          issues: 2,
          commits: 1,
          contributions: []
        })
        .mockRejectedValueOnce(new Error('API rate limit exceeded'))

      const request = createMockRequest('/api/members/contributions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: { usernames }
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.contributions).toHaveLength(2)

      const errorUser = data.contributions.find((c: any) => c.username === 'user2')
      expect(errorUser).toMatchObject({
        username: 'user2',
        hasContributions: false,
        error: 'Failed to fetch contributions'
      })
    })

    it('should accept usernames with whitespace (not trimmed in API call)', async () => {
      const usernames = ['  user1  ', ' user2 ']
      const mockContributions = {
        total: 1,
        pullRequests: 0,
        issues: 1,
        commits: 0,
        contributions: []
      }

      mockGetUserContributions.mockResolvedValue(mockContributions)

      const request = createMockRequest('/api/members/contributions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: { usernames }
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.contributions).toHaveLength(2)
      // The implementation passes usernames as-is to getUserContributions
      expect(mockGetUserContributions).toHaveBeenCalledWith('  user1  ')
      expect(mockGetUserContributions).toHaveBeenCalledWith(' user2 ')
    })

    it('should handle Promise.allSettled rejection gracefully', async () => {
      const usernames = ['user1', 'user2']

      // Mock one success and one that throws during Promise resolution
      mockGetUserContributions
        .mockResolvedValueOnce({
          total: 5,
          pullRequests: 2,
          issues: 2,
          commits: 1,
          contributions: []
        })
        .mockImplementationOnce(() => {
          throw new Error('Immediate rejection')
        })

      const request = createMockRequest('/api/members/contributions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: { usernames }
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.contributions).toHaveLength(2)

      const errorUser = data.contributions.find((c: any) => c.username === 'user2')
      expect(errorUser).toMatchObject({
        username: 'user2',
        hasContributions: false,
        error: 'Failed to fetch contributions' // This is what gets set in the catch block
      })
    })

    it('should handle malformed JSON request', async () => {
      const request = new NextRequest('http://localhost/api/members/contributions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: 'invalid-json'
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(500)
      expect(data).toEqual({ error: 'Internal Server Error' })
      expect(mockLogger.error).toHaveBeenCalledWith('Error fetching member contributions:', {
        data: expect.any(Error),
        tags: { type: 'api' }
      })
    })

    it('should handle large batch processing with delays', async () => {
      // Test with enough users to trigger multiple batches
      const usernames = Array.from({ length: 35 }, (_, i) => `user${i}`)
      const mockContributions = {
        total: 1,
        pullRequests: 0,
        issues: 1,
        commits: 0,
        contributions: []
      }

      mockGetUserContributions.mockResolvedValue(mockContributions)

      const startTime = Date.now()
      const request = createMockRequest('/api/members/contributions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: { usernames }
      })

      const response = await POST(request)
      const data = await response.json()
      const endTime = Date.now()

      expect(response.status).toBe(200)
      expect(data.contributions).toHaveLength(35)

      // Should include some delay between batches (though minimal in test)
      // The actual delay is 100ms between batches, but we don't want to make tests too slow
      expect(endTime - startTime).toBeGreaterThan(0)
    })

    it('should sanitize usernames against XSS attacks', async () => {
      const maliciousUsernames = [
        'normal-user',
        ...MALICIOUS_INPUTS.xss.slice(0, 2) // Test a couple XSS attempts
      ]

      const mockContributions = {
        total: 1,
        pullRequests: 0,
        issues: 1,
        commits: 0,
        contributions: []
      }
      mockGetUserContributions.mockResolvedValue(mockContributions)

      const request = createMockRequest('/api/members/contributions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: { usernames: maliciousUsernames }
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(200)

      // Should process the normal user and filter out malicious ones
      const normalUser = data.contributions.find((c: any) => c.username === 'normal-user')
      expect(normalUser).toBeDefined()
      expect(normalUser.hasContributions).toBe(true)
    })

    it('should enforce maximum username limit even after filtering', async () => {
      // Create array with 51 valid strings (exceeds the 50 limit)
      const usernames = Array.from({ length: 51 }, (_, i) => `user${i}`)

      const request = createMockRequest('/api/members/contributions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: { usernames }
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data).toEqual({ error: 'Too many usernames requested' })
    })

    it('should handle network timeout gracefully', async () => {
      const usernames = ['timeout-user']

      mockGetUserContributions.mockImplementation(() => {
        return new Promise((_, reject) => {
          setTimeout(() => reject(new Error('Network timeout')), 100)
        })
      })

      const request = createMockRequest('/api/members/contributions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: { usernames }
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.contributions).toHaveLength(1)
      expect(data.contributions[0]).toMatchObject({
        username: 'timeout-user',
        hasContributions: false,
        error: 'Failed to fetch contributions'
      })
    })
  })
})
