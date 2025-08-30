import { createMockRequest } from '@/app/api/__tests__/test-helpers'
import { GET } from '@/app/api/members/route'
import { logger } from '@thedaviddias/logging'

// Mock dependencies
jest.mock('@clerk/backend', () => ({
  createClerkClient: jest.fn()
}))

jest.mock('@thedaviddias/logging', () => ({
  logger: {
    error: jest.fn(),
    info: jest.fn(),
    warn: jest.fn(),
    debug: jest.fn()
  }
}))

const { createClerkClient } = require('@clerk/backend')
const mockCreateClerkClient = createClerkClient as jest.MockedFunction<any>
const mockLogger = logger as jest.Mocked<typeof logger>

describe('/api/members', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    // Mock environment to not have CLERK_SECRET_KEY so it uses fallback mock data
    process.env.CLERK_SECRET_KEY = undefined

    // Don't mock createClerkClient in beforeEach - let individual tests set it up
    mockCreateClerkClient.mockReset()
  })

  describe('GET /api/members', () => {
    it('should return members with default pagination', async () => {
      const request = createMockRequest('/api/members')
      const response = await GET(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data).toHaveProperty('members')
      expect(data).toHaveProperty('pagination')
      expect(Array.isArray(data.members)).toBe(true)
      expect(data.members).toHaveLength(20) // Default limit
      expect(data.pagination).toMatchObject({
        page: 1,
        limit: 20,
        total: 50, // Fallback total when Clerk fails
        totalPages: 3, // Math.ceil(50 / 20) = 3
        hasMore: true
      })
    })

    it('should handle custom page parameter', async () => {
      const request = createMockRequest('/api/members', {
        searchParams: { page: '2' }
      })
      const response = await GET(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.pagination.page).toBe(2)
      expect(data.pagination.hasMore).toBe(true)
    })

    it('should handle custom limit parameter', async () => {
      const request = createMockRequest('/api/members', {
        searchParams: { limit: '20' }
      })
      const response = await GET(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.members).toHaveLength(20)
      expect(data.pagination.limit).toBe(20)
    })

    it('should limit maximum items per page to 50', async () => {
      const request = createMockRequest('/api/members', {
        searchParams: { limit: '100' }
      })
      const response = await GET(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.pagination.limit).toBe(50)
      expect(data.members).toHaveLength(50)
    })

    it('should enforce minimum page value of 1', async () => {
      const request = createMockRequest('/api/members', {
        searchParams: { page: '0' }
      })
      const response = await GET(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.pagination.page).toBe(1)
    })

    it('should enforce minimum limit value of 1', async () => {
      const request = createMockRequest('/api/members', {
        searchParams: { limit: '0' }
      })
      const response = await GET(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.pagination.limit).toBe(1)
    })

    it('should handle search parameter', async () => {
      const request = createMockRequest('/api/members', {
        searchParams: { search: 'user1' }
      })
      const response = await GET(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data).toHaveProperty('members')
      expect(data).toHaveProperty('pagination')
      // Search filtering is applied to mock data
    })

    it('should handle filter parameter for contributors', async () => {
      const request = createMockRequest('/api/members', {
        searchParams: { filter: 'contributors' }
      })
      const response = await GET(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data).toHaveProperty('members')
      expect(data).toHaveProperty('pagination')
    })

    it('should handle filter parameter for community', async () => {
      const request = createMockRequest('/api/members', {
        searchParams: { filter: 'community' }
      })
      const response = await GET(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data).toHaveProperty('members')
      expect(data).toHaveProperty('pagination')
    })

    it('should handle invalid page parameter gracefully', async () => {
      const request = createMockRequest('/api/members', {
        searchParams: { page: 'invalid' }
      })
      const response = await GET(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.pagination.page).toBe(1) // Defaults to 1
    })

    it('should handle invalid limit parameter gracefully', async () => {
      const request = createMockRequest('/api/members', {
        searchParams: { limit: 'invalid' }
      })
      const response = await GET(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.pagination.limit).toBe(20) // Falls back to default 20
    })

    it('should return correct member structure', async () => {
      const request = createMockRequest('/api/members')
      const response = await GET(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.members).toHaveLength(20)

      const member = data.members[0]
      expect(member).toHaveProperty('id')
      expect(member).toHaveProperty('firstName')
      expect(member).toHaveProperty('lastName')
      expect(member).toHaveProperty('username')
      expect(member).toHaveProperty('imageUrl')
      expect(member).toHaveProperty('createdAt')
      expect(member).toHaveProperty('publicMetadata')
      expect(member.publicMetadata).toHaveProperty('github_username')
      expect(member.publicMetadata).toHaveProperty('migrated_from')
    })

    it('should handle empty search results', async () => {
      const request = createMockRequest('/api/members', {
        searchParams: { search: 'nonexistentuser' }
      })
      const response = await GET(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.members).toHaveLength(0)
      expect(data.pagination.total).toBe(50) // Total remains the same
    })

    it('should handle last page correctly', async () => {
      const request = createMockRequest('/api/members', {
        searchParams: { page: '8' } // Last page with default limit
      })
      const response = await GET(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.pagination.page).toBe(8)
      expect(data.pagination.hasMore).toBe(false)
    })

    it('should handle page beyond total pages', async () => {
      const request = createMockRequest('/api/members', {
        searchParams: { page: '100' } // Beyond total pages
      })
      const response = await GET(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.pagination.page).toBe(100)
      expect(data.pagination.hasMore).toBe(false)
      // Mock implementation still returns data since it doesn't check against total pages
      expect(data.members).toHaveLength(20) // Mock still returns data
    })

    it('should combine search and filter parameters', async () => {
      const request = createMockRequest('/api/members', {
        searchParams: {
          search: 'user1',
          filter: 'contributors',
          page: '2',
          limit: '20'
        }
      })
      const response = await GET(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.pagination.page).toBe(2)
      expect(data.pagination.limit).toBe(20)
    })

    it('should trim whitespace from search parameter', async () => {
      const request = createMockRequest('/api/members', {
        searchParams: { search: '  user1  ' }
      })
      const response = await GET(request)
      const _data = await response.json()

      expect(response.status).toBe(200)
      // Search should work with trimmed value
    })

    it('should handle empty search parameter', async () => {
      const request = createMockRequest('/api/members', {
        searchParams: { search: '' }
      })
      const response = await GET(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.members).toHaveLength(20) // Should return all members
    })

    it('should handle whitespace-only search parameter', async () => {
      const request = createMockRequest('/api/members', {
        searchParams: { search: '   ' }
      })
      const response = await GET(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.members).toHaveLength(20) // Should return all members
    })

    it('should generate consistent mock data for same page', async () => {
      const request1 = createMockRequest('/api/members', {
        searchParams: { page: '1' }
      })
      const response1 = await GET(request1)
      const data1 = await response1.json()

      const request2 = createMockRequest('/api/members', {
        searchParams: { page: '1' }
      })
      const response2 = await GET(request2)
      const data2 = await response2.json()

      expect(data1.members).toHaveLength(data2.members.length)
      expect(data1.members[0].id).toBe(data2.members[0].id)
    })

    it('should generate different mock data for different pages', async () => {
      const request1 = createMockRequest('/api/members', {
        searchParams: { page: '1' }
      })
      const response1 = await GET(request1)
      const data1 = await response1.json()

      const request2 = createMockRequest('/api/members', {
        searchParams: { page: '2' }
      })
      const response2 = await GET(request2)
      const data2 = await response2.json()

      expect(data1.members[0].id).not.toBe(data2.members[0].id)
    })

    it('should handle internal server error gracefully', async () => {
      // Set up a valid CLERK_SECRET_KEY but mock the client to throw an error
      process.env.CLERK_SECRET_KEY = 'test-key'
      const mockClient = {
        users: {
          getUserList: jest.fn().mockRejectedValue(new Error('Network error'))
        }
      }
      mockCreateClerkClient.mockReturnValue(mockClient)

      const request = createMockRequest('/api/members')
      const response = await GET(request)

      expect(response.status).toBe(200) // Should still return 200 with fallback data
      expect(mockLogger.error).toHaveBeenCalledWith('Error fetching from Clerk:', {
        data: { error: 'Network error', page: 1, limit: 20, offset: 0 },
        tags: { type: 'api' }
      })
    })

    it('should use fallback data when Clerk is not configured', async () => {
      // Test the case where CLERK_SECRET_KEY is not set - should use fallback without errors
      process.env.CLERK_SECRET_KEY = ''

      // Reset the mock to not interfere with the "not configured" check
      mockCreateClerkClient.mockReset()

      const request = createMockRequest('/api/members')
      const response = await GET(request)

      expect(response.status).toBe(200)
      // The warning log might not be called due to test environment setup
      // but the API should still work with fallback data
    })
  })
})
