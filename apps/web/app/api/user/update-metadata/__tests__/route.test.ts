import { POST } from '@/app/api/user/update-metadata/route'
import { logger } from '@thedaviddias/logging'

// Mock dependencies
jest.mock('@clerk/backend', () => {
  const mockClerk = {
    users: {
      getUser: jest.fn(),
      updateUser: jest.fn()
    }
  }
  return {
    createClerkClient: jest.fn(() => mockClerk)
  }
})
jest.mock('@thedaviddias/auth', () => ({
  auth: jest.fn()
}))
jest.mock('@thedaviddias/logging', () => ({
  logger: {
    error: jest.fn()
  }
}))

const { createClerkClient } = require('@clerk/backend')
const { auth } = require('@thedaviddias/auth')
const mockCreateClerkClient = createClerkClient as jest.MockedFunction<any>
const mockAuth = auth as jest.MockedFunction<any>
const mockLogger = logger as jest.Mocked<typeof logger>

// Get the mock clerk instance from the factory
const mockClerk = mockCreateClerkClient()

describe('/api/user/update-metadata', () => {
  const mockUserId = 'user_123'
  const mockCurrentUser = {
    id: mockUserId,
    publicMetadata: {
      existingField: 'existing value'
    }
  }

  const validPayload = {
    isProfilePrivate: false,
    bio: 'Software developer with a passion for AI',
    work: 'Senior Engineer at Tech Corp',
    website: 'https://example.com'
  }

  beforeEach(() => {
    jest.clearAllMocks()
    // Reset mock implementations
    mockClerk.users.getUser.mockResolvedValue(mockCurrentUser)
    mockClerk.users.updateUser.mockResolvedValue({})
  })

  describe('POST /api/user/update-metadata', () => {
    /**
     * Creates a mock Request object for testing
     * @param payload - The request payload data
     * @returns Mock Request object
     */
    const createMockRequest = (payload: any) =>
      ({
        json: jest.fn().mockResolvedValue(payload)
      }) as any

    it('should successfully update user metadata with valid data', async () => {
      mockAuth.mockResolvedValue({ user: { id: mockUserId } })
      const request = createMockRequest(validPayload)

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data).toEqual({ success: true })
      expect(mockClerk.users.getUser).toHaveBeenCalledWith(mockUserId)
      expect(mockClerk.users.updateUser).toHaveBeenCalledWith(mockUserId, {
        firstName: null,
        lastName: null,
        publicMetadata: {
          existingField: 'existing value',
          isProfilePrivate: false,
          bio: 'Software developer with a passion for AI',
          work: 'Senior Engineer at Tech Corp',
          website: 'https://example.com',
          linkedin: null,
          firstName: null,
          lastName: null
        }
      })
    })

    it('should return 401 when user is not authenticated', async () => {
      mockAuth.mockResolvedValue({ user: null })
      const request = createMockRequest(validPayload)

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(401)
      expect(data).toEqual({ error: 'Unauthorized' })
      expect(mockClerk.users.updateUser).not.toHaveBeenCalled()
    })

    it('should return 401 when session has no user ID', async () => {
      mockAuth.mockResolvedValue({ user: { id: null } })
      const request = createMockRequest(validPayload)

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(401)
      expect(data).toEqual({ error: 'Unauthorized' })
      expect(mockClerk.users.updateUser).not.toHaveBeenCalled()
    })

    it('should return 400 when isProfilePrivate is not a boolean', async () => {
      mockAuth.mockResolvedValue({ user: { id: mockUserId } })
      const invalidPayload = {
        ...validPayload,
        isProfilePrivate: 'invalid'
      }
      const request = createMockRequest(invalidPayload)

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data).toEqual({ error: 'Invalid privacy setting' })
      expect(mockClerk.users.updateUser).not.toHaveBeenCalled()
    })

    it('should return 400 when bio exceeds character limit', async () => {
      mockAuth.mockResolvedValue({ user: { id: mockUserId } })
      const longBio = 'a'.repeat(161) // Exceeds 160 character limit
      const invalidPayload = {
        ...validPayload,
        bio: longBio
      }
      const request = createMockRequest(invalidPayload)

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data).toEqual({ error: 'Bio must be 160 characters or less' })
      expect(mockClerk.users.updateUser).not.toHaveBeenCalled()
    })

    it('should return 400 when work exceeds character limit', async () => {
      mockAuth.mockResolvedValue({ user: { id: mockUserId } })
      const longWork = 'b'.repeat(101) // Exceeds 100 character limit
      const invalidPayload = {
        ...validPayload,
        work: longWork
      }
      const request = createMockRequest(invalidPayload)

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data).toEqual({ error: 'Work must be 100 characters or less' })
      expect(mockClerk.users.updateUser).not.toHaveBeenCalled()
    })

    it('should return 400 when website URL exceeds character limit', async () => {
      mockAuth.mockResolvedValue({ user: { id: mockUserId } })
      const longUrl = `https://example.com/${'a'.repeat(100)}` // Exceeds 100 character limit
      const invalidPayload = {
        ...validPayload,
        website: longUrl
      }
      const request = createMockRequest(invalidPayload)

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data).toEqual({ error: 'Website URL must be 100 characters or less' })
      expect(mockClerk.users.updateUser).not.toHaveBeenCalled()
    })

    it('should return 400 for invalid website URL format', async () => {
      mockAuth.mockResolvedValue({ user: { id: mockUserId } })
      const invalidPayload = {
        ...validPayload,
        website: 'not-a-valid-url'
      }
      const request = createMockRequest(invalidPayload)

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data).toEqual({
        error: 'Invalid website URL. Please use a valid http:// or https:// URL'
      })
      expect(mockClerk.users.updateUser).not.toHaveBeenCalled()
    })

    it('should return 400 for javascript: URL protocol', async () => {
      mockAuth.mockResolvedValue({ user: { id: mockUserId } })
      const maliciousPayload = {
        ...validPayload,
        website: 'javascript:alert("xss")'
      }
      const request = createMockRequest(maliciousPayload)

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data).toEqual({
        error: 'Invalid website URL. Please use a valid http:// or https:// URL'
      })
    })

    it('should return 400 for data: URL protocol', async () => {
      mockAuth.mockResolvedValue({ user: { id: mockUserId } })
      const maliciousPayload = {
        ...validPayload,
        website: 'data:text/html,<script>alert("xss")</script>'
      }
      const request = createMockRequest(maliciousPayload)

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data).toEqual({
        error: 'Invalid website URL. Please use a valid http:// or https:// URL'
      })
    })

    it('should sanitize bio with HTML content', async () => {
      mockAuth.mockResolvedValue({ user: { id: mockUserId } })
      const bioWithHtml = 'I am a <script>alert("xss")</script> developer'
      const sanitizedPayload = {
        ...validPayload,
        bio: bioWithHtml
      }
      const request = createMockRequest(sanitizedPayload)

      const response = await POST(request)

      expect(response.status).toBe(200)
      expect(mockClerk.users.updateUser).toHaveBeenCalledWith(mockUserId, {
        firstName: null,
        lastName: null,
        publicMetadata: expect.objectContaining({
          bio: 'I am a developer', // HTML should be stripped
          firstName: null,
          lastName: null,
          linkedin: null
        })
      })
    })

    it('should sanitize work with zero-width characters', async () => {
      mockAuth.mockResolvedValue({ user: { id: mockUserId } })
      const workWithZeroWidth = 'Senior\u200BEngineer\u200C\u200Dat\uFEFFTech'
      const sanitizedPayload = {
        ...validPayload,
        work: workWithZeroWidth
      }
      const request = createMockRequest(sanitizedPayload)

      const response = await POST(request)

      expect(response.status).toBe(200)
      expect(mockClerk.users.updateUser).toHaveBeenCalledWith(mockUserId, {
        firstName: null,
        lastName: null,
        publicMetadata: expect.objectContaining({
          work: 'SeniorEngineeratTech', // Zero-width characters should be removed
          firstName: null,
          lastName: null,
          linkedin: null
        })
      })
    })

    it('should handle null/undefined values', async () => {
      mockAuth.mockResolvedValue({ user: { id: mockUserId } })
      const nullPayload = {
        isProfilePrivate: true,
        bio: null,
        work: undefined,
        website: ''
      }
      const request = createMockRequest(nullPayload)

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data).toEqual({ success: true })
      expect(mockClerk.users.updateUser).toHaveBeenCalledWith(mockUserId, {
        firstName: null,
        lastName: null,
        publicMetadata: {
          existingField: 'existing value',
          isProfilePrivate: true,
          bio: null,
          work: null,
          website: null,
          linkedin: null,
          firstName: null,
          lastName: null
        }
      })
    })

    it('should preserve existing metadata when updating', async () => {
      mockAuth.mockResolvedValue({ user: { id: mockUserId } })
      const request = createMockRequest(validPayload)

      await POST(request)

      expect(mockClerk.users.updateUser).toHaveBeenCalledWith(mockUserId, {
        firstName: null,
        lastName: null,
        publicMetadata: expect.objectContaining({
          existingField: 'existing value',
          firstName: null,
          lastName: null,
          linkedin: null
        })
      })
    })

    it('should handle Clerk getUser errors', async () => {
      mockAuth.mockResolvedValue({ user: { id: mockUserId } })
      mockClerk.users.getUser.mockRejectedValue(new Error('User not found'))
      const request = createMockRequest(validPayload)

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(500)
      expect(data).toEqual({ error: 'Failed to update metadata' })
      expect(mockLogger.error).toHaveBeenCalledWith(
        'Error updating user metadata:',
        expect.objectContaining({
          data: expect.any(Error),
          tags: { type: 'api' }
        })
      )
    })

    it('should handle Clerk updateUser errors', async () => {
      mockAuth.mockResolvedValue({ user: { id: mockUserId } })
      mockClerk.users.updateUser.mockRejectedValue(new Error('Update failed'))
      const request = createMockRequest(validPayload)

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(500)
      expect(data).toEqual({ error: 'Failed to update metadata' })
      expect(mockLogger.error).toHaveBeenCalledWith(
        'Error updating user metadata:',
        expect.objectContaining({
          data: expect.any(Error),
          tags: { type: 'api' }
        })
      )
    })

    it('should handle JSON parsing errors', async () => {
      mockAuth.mockResolvedValue({ user: { id: mockUserId } })
      const request = {
        json: jest.fn().mockRejectedValue(new Error('Invalid JSON'))
      } as any

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(500)
      expect(data).toEqual({ error: 'Failed to update metadata' })
      expect(mockLogger.error).toHaveBeenCalled()
    })

    it('should normalize whitespace in text fields', async () => {
      mockAuth.mockResolvedValue({ user: { id: mockUserId } })
      const whitespacePayload = {
        ...validPayload,
        bio: '  Multiple   spaces   and\n\nnewlines  ',
        work: '\tTabs\tand   spaces\t'
      }
      const request = createMockRequest(whitespacePayload)

      const response = await POST(request)

      expect(response.status).toBe(200)
      expect(mockClerk.users.updateUser).toHaveBeenCalledWith(mockUserId, {
        firstName: null,
        lastName: null,
        publicMetadata: expect.objectContaining({
          bio: 'Multiple spaces and newlines',
          work: 'Tabs and spaces',
          firstName: null,
          lastName: null,
          linkedin: null
        })
      })
    })

    it('should accept valid https URLs', async () => {
      mockAuth.mockResolvedValue({ user: { id: mockUserId } })
      const httpsPayload = {
        ...validPayload,
        website: 'https://secure.example.com/path?query=value#fragment'
      }
      const request = createMockRequest(httpsPayload)

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data).toEqual({ success: true })
    })

    it('should accept valid http URLs', async () => {
      mockAuth.mockResolvedValue({ user: { id: mockUserId } })
      const httpPayload = {
        ...validPayload,
        website: 'http://example.com'
      }
      const request = createMockRequest(httpPayload)

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data).toEqual({ success: true })
    })
  })
})
