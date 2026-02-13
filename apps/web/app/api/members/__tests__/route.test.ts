import { createMockRequest } from '@/app/api/__tests__/test-helpers'
import { GET } from '@/app/api/members/route'

// Generate a deterministic set of mock members for testing
function createMockMembers(count: number) {
  return Array.from({ length: count }, (_, i) => ({
    id: `user-${i + 1}`,
    firstName: `First${i + 1}`,
    lastName: `Last${i + 1}`,
    username: `user_${i + 1}`,
    imageUrl: `https://example.com/avatar-${i + 1}.png`,
    createdAt: new Date(Date.UTC(2024, 0, 1 + i)).toISOString(),
    publicMetadata: {
      github_username: i % 2 === 0 ? `github-user${i + 1}` : null,
      migrated_from: null,
      isProfilePrivate: false
    },
    hasContributions: i % 3 === 0
  }))
}

const MOCK_MEMBERS = createMockMembers(150)

jest.mock('@/lib/member-server-utils', () => ({
  getCachedMembers: jest.fn(() => Promise.resolve(MOCK_MEMBERS))
}))

jest.mock('@thedaviddias/logging', () => ({
  logger: {
    error: jest.fn(),
    info: jest.fn(),
    warn: jest.fn(),
    debug: jest.fn()
  }
}))

describe('/api/members', () => {
  beforeEach(() => {
    jest.clearAllMocks()
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
      expect(data.members).toHaveLength(20)
      expect(data.pagination).toMatchObject({
        page: 1,
        limit: 20,
        total: 150,
        totalPages: 8,
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
      // Second page should have different members than first
      expect(data.members[0].id).toBe('user-21')
    })

    it('should handle custom limit parameter', async () => {
      const request = createMockRequest('/api/members', {
        searchParams: { limit: '10' }
      })
      const response = await GET(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.members).toHaveLength(10)
      expect(data.pagination.limit).toBe(10)
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
        searchParams: { search: 'First1' }
      })
      const response = await GET(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.members.length).toBeGreaterThan(0)
      // All results should match the search
      for (const member of data.members) {
        const matches =
          `${member.firstName} ${member.lastName}`.toLowerCase().includes('first1') ||
          (member.username || '').toLowerCase().includes('first1') ||
          (member.publicMetadata?.github_username || '').toLowerCase().includes('first1')
        expect(matches).toBe(true)
      }
    })

    it('should handle invalid page parameter gracefully', async () => {
      const request = createMockRequest('/api/members', {
        searchParams: { page: 'invalid' }
      })
      const response = await GET(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.pagination.page).toBe(1)
    })

    it('should handle invalid limit parameter gracefully', async () => {
      const request = createMockRequest('/api/members', {
        searchParams: { limit: 'invalid' }
      })
      const response = await GET(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.pagination.limit).toBe(20)
    })

    it('should return correct member structure', async () => {
      const request = createMockRequest('/api/members')
      const response = await GET(request)
      const data = await response.json()

      expect(response.status).toBe(200)
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
        searchParams: { search: 'zzz_nonexistent_zzz' }
      })
      const response = await GET(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.members).toHaveLength(0)
      expect(data.pagination.total).toBe(0)
    })

    it('should handle last page correctly', async () => {
      const request = createMockRequest('/api/members', {
        searchParams: { page: '8' }
      })
      const response = await GET(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.pagination.page).toBe(8)
      expect(data.pagination.hasMore).toBe(false)
      expect(data.members).toHaveLength(10) // 150 - 7*20 = 10
    })

    it('should handle page beyond total pages', async () => {
      const request = createMockRequest('/api/members', {
        searchParams: { page: '100' }
      })
      const response = await GET(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.pagination.page).toBe(100)
      expect(data.pagination.hasMore).toBe(false)
      expect(data.members).toHaveLength(0) // No members on page 100
    })

    it('should handle whitespace-only search parameter', async () => {
      const request = createMockRequest('/api/members', {
        searchParams: { search: '   ' }
      })
      const response = await GET(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.members).toHaveLength(20) // No filter applied
    })

    it('should return consistent results for same parameters', async () => {
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

    it('should return different results for different pages', async () => {
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

    it('should handle getCachedMembers failure gracefully', async () => {
      const { getCachedMembers } = require('@/lib/member-server-utils')
      getCachedMembers.mockRejectedValueOnce(new Error('Redis unavailable'))

      const request = createMockRequest('/api/members')
      const response = await GET(request)
      const data = await response.json()

      expect(response.status).toBe(500)
      expect(data).toEqual({ error: 'Internal Server Error' })
    })
  })
})
