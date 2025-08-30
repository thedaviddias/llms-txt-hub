import { GET, POST } from '@/app/api/user/favorites/route'
import { logger } from '@thedaviddias/logging'
import { NextRequest } from 'next/server'

// Mock dependencies
jest.mock('@clerk/nextjs/server', () => ({
  auth: jest.fn(),
  clerkClient: jest.fn()
}))
jest.mock('@thedaviddias/logging', () => ({
  logger: {
    error: jest.fn()
  }
}))

const { auth, clerkClient } = require('@clerk/nextjs/server')
const mockAuth = auth as jest.MockedFunction<any>
const mockClerkClient = clerkClient as jest.MockedFunction<any>
const mockLogger = logger as jest.Mocked<typeof logger>

describe('/api/user/favorites', () => {
  const mockUserId = 'user_123'
  const mockClient = {
    users: {
      getUser: jest.fn(),
      updateUserMetadata: jest.fn()
    }
  }

  beforeEach(() => {
    jest.clearAllMocks()
    mockClerkClient.mockResolvedValue(mockClient as any)
  })

  describe('GET /api/user/favorites', () => {
    it('should return user favorites when authenticated', async () => {
      const mockFavorites = ['site1', 'site2', 'site3']
      mockAuth.mockResolvedValue({ userId: mockUserId })
      mockClient.users.getUser.mockResolvedValue({
        privateMetadata: { favorites: mockFavorites }
      } as any)

      const response = await GET()
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data).toEqual({ favorites: mockFavorites })
      expect(mockClient.users.getUser).toHaveBeenCalledWith(mockUserId)
    })

    it('should return empty array when user has no favorites', async () => {
      mockAuth.mockResolvedValue({ userId: mockUserId })
      mockClient.users.getUser.mockResolvedValue({
        privateMetadata: {}
      } as any)

      const response = await GET()
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data).toEqual({ favorites: [] })
    })

    it('should return 401 when user is not authenticated', async () => {
      mockAuth.mockResolvedValue({ userId: null })

      const response = await GET()
      const data = await response.json()

      expect(response.status).toBe(401)
      expect(data).toEqual({ error: 'Unauthorized' })
      expect(mockClient.users.getUser).not.toHaveBeenCalled()
    })

    it('should handle Clerk API errors gracefully', async () => {
      const error = new Error('Clerk API error')
      mockAuth.mockResolvedValue({ userId: mockUserId })
      mockClient.users.getUser.mockRejectedValue(error)

      const response = await GET()
      const data = await response.json()

      expect(response.status).toBe(500)
      expect(data).toEqual({ error: 'Internal Server Error' })
      expect(mockLogger.error).toHaveBeenCalledWith('Failed to get user favorites', {
        data: error,
        tags: { api: 'favorites' }
      })
    })
  })

  describe('POST /api/user/favorites', () => {
    it('should update user favorites with valid input', async () => {
      const favorites = ['site1', 'site2']
      mockAuth.mockResolvedValue({ userId: mockUserId })

      const request = new NextRequest('http://localhost/api/user/favorites', {
        method: 'POST',
        body: JSON.stringify({ favorites })
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data).toEqual({ success: true })
      expect(mockClient.users.updateUserMetadata).toHaveBeenCalledWith(mockUserId, {
        privateMetadata: { favorites }
      })
    })

    it('should sanitize favorite strings', async () => {
      const favorites = ['<script>alert("xss")</script>site1', 'site2  ']
      const expectedSanitized = ['site1', 'site2']
      mockAuth.mockResolvedValue({ userId: mockUserId })

      const request = new NextRequest('http://localhost/api/user/favorites', {
        method: 'POST',
        body: JSON.stringify({ favorites })
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data).toEqual({ success: true })
      expect(mockClient.users.updateUserMetadata).toHaveBeenCalledWith(mockUserId, {
        privateMetadata: { favorites: expectedSanitized }
      })
    })

    it('should return 401 when user is not authenticated', async () => {
      mockAuth.mockResolvedValue({ userId: null })

      const request = new NextRequest('http://localhost/api/user/favorites', {
        method: 'POST',
        body: JSON.stringify({ favorites: ['site1'] })
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(401)
      expect(data).toEqual({ error: 'Unauthorized' })
      expect(mockClient.users.updateUserMetadata).not.toHaveBeenCalled()
    })

    it('should return 400 when favorites is not an array', async () => {
      mockAuth.mockResolvedValue({ userId: mockUserId })

      const request = new NextRequest('http://localhost/api/user/favorites', {
        method: 'POST',
        body: JSON.stringify({ favorites: 'not-an-array' })
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data).toEqual({ error: 'Invalid favorites format' })
    })

    it('should reject favorites with invalid format', async () => {
      mockAuth.mockResolvedValue({ userId: mockUserId })

      const request = new NextRequest('http://localhost/api/user/favorites', {
        method: 'POST',
        body: JSON.stringify({ favorites: [123, 'valid'] })
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(500)
      expect(data).toEqual({ error: 'Internal Server Error' })
      expect(mockLogger.error).toHaveBeenCalled()
    })

    it('should reject favorites that are too long', async () => {
      const longFavorite = 'a'.repeat(101)
      mockAuth.mockResolvedValue({ userId: mockUserId })

      const request = new NextRequest('http://localhost/api/user/favorites', {
        method: 'POST',
        body: JSON.stringify({ favorites: [longFavorite] })
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(500)
      expect(data).toEqual({ error: 'Internal Server Error' })
      expect(mockLogger.error).toHaveBeenCalled()
    })

    it('should reject empty favorite strings', async () => {
      mockAuth.mockResolvedValue({ userId: mockUserId })

      const request = new NextRequest('http://localhost/api/user/favorites', {
        method: 'POST',
        body: JSON.stringify({ favorites: [''] })
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(500)
      expect(data).toEqual({ error: 'Internal Server Error' })
      expect(mockLogger.error).toHaveBeenCalled()
    })

    it('should reject too many favorites', async () => {
      const manyFavorites = Array.from({ length: 1001 }, (_, i) => `site${i}`)
      mockAuth.mockResolvedValue({ userId: mockUserId })

      const request = new NextRequest('http://localhost/api/user/favorites', {
        method: 'POST',
        body: JSON.stringify({ favorites: manyFavorites })
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data).toEqual({ error: 'Too many favorites' })
    })

    it('should handle malformed JSON', async () => {
      mockAuth.mockResolvedValue({ userId: mockUserId })

      const request = new NextRequest('http://localhost/api/user/favorites', {
        method: 'POST',
        body: 'invalid-json'
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(500)
      expect(data).toEqual({ error: 'Internal Server Error' })
      expect(mockLogger.error).toHaveBeenCalled()
    })

    it('should handle Clerk API errors during update', async () => {
      const error = new Error('Clerk API error')
      mockAuth.mockResolvedValue({ userId: mockUserId })
      mockClient.users.updateUserMetadata.mockRejectedValue(error)

      const request = new NextRequest('http://localhost/api/user/favorites', {
        method: 'POST',
        body: JSON.stringify({ favorites: ['site1'] })
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(500)
      expect(data).toEqual({ error: 'Internal Server Error' })
      expect(mockLogger.error).toHaveBeenCalledWith('Failed to update user favorites', {
        data: error,
        tags: { api: 'favorites' }
      })
    })
  })
})
