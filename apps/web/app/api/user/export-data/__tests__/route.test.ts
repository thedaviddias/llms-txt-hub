import { GET } from '@/app/api/user/export-data/route'
import { logger } from '@thedaviddias/logging'

// Mock dependencies
jest.mock('@thedaviddias/auth', () => ({
  auth: jest.fn()
}))
jest.mock('@thedaviddias/logging', () => ({
  logger: {
    info: jest.fn(),
    error: jest.fn()
  }
}))

const { auth } = require('@thedaviddias/auth')
const mockAuth = auth as jest.MockedFunction<any>
const mockLogger = logger as jest.Mocked<typeof logger>

describe('/api/user/export-data', () => {
  const mockUser = {
    id: 'user_123',
    email: 'test@example.com',
    user_metadata: {
      user_name: 'testuser',
      avatar_url: 'https://github.com/testuser.png'
    }
  }

  beforeEach(() => {
    jest.clearAllMocks()
  })

  describe('GET /api/user/export-data', () => {
    it('should successfully export user data for GitHub user', async () => {
      mockAuth.mockResolvedValue({ user: mockUser })

      const response = await GET()
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data).toMatchObject({
        exportVersion: '1.0',
        account: {
          id: mockUser.id,
          email: mockUser.email
        },
        metadata: {
          userMetadata: mockUser.user_metadata
        },
        platformData: {
          accountType: 'GitHub',
          githubConnected: true,
          githubUsername: 'testuser'
        },
        privacyNotice: {
          message: expect.stringContaining('personal data'),
          dataTypes: expect.arrayContaining(['Account information (email, name, creation date)']),
          retention: expect.stringContaining('deletion'),
          contact: expect.stringContaining('contact us')
        }
      })
      expect(data.exportDate).toBeDefined()
      expect(mockLogger.info).toHaveBeenCalledWith(
        'Data export generated',
        expect.objectContaining({
          data: expect.objectContaining({
            userId: mockUser.id,
            exportSize: expect.any(Number)
          }),
          tags: { type: 'privacy' }
        })
      )
    })

    it('should successfully export user data for email-only user', async () => {
      const emailUser = {
        id: 'user_456',
        email: 'email@example.com',
        user_metadata: {}
      }
      mockAuth.mockResolvedValue({ user: emailUser })

      const response = await GET()
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.account).toEqual({
        id: emailUser.id,
        email: emailUser.email
      })
      expect(data.platformData).toEqual({
        accountType: 'Email',
        githubConnected: false,
        githubUsername: null
      })
      expect(data.metadata.userMetadata).toEqual({})
    })

    it('should return 401 when user is not authenticated', async () => {
      mockAuth.mockResolvedValue({ user: null })

      const response = await GET()
      const data = await response.json()

      expect(response.status).toBe(401)
      expect(data).toEqual({ error: 'Authentication required' })
      expect(mockLogger.info).not.toHaveBeenCalled()
    })

    it('should return 401 when session is null', async () => {
      mockAuth.mockResolvedValue(null)

      const response = await GET()
      const data = await response.json()

      expect(response.status).toBe(401)
      expect(data).toEqual({ error: 'Authentication required' })
      expect(mockLogger.info).not.toHaveBeenCalled()
    })

    it('should handle user with null user_metadata', async () => {
      const userWithoutMetadata = {
        id: 'user_789',
        email: 'nodata@example.com',
        user_metadata: null
      }
      mockAuth.mockResolvedValue({ user: userWithoutMetadata })

      const response = await GET()
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.metadata.userMetadata).toEqual({})
      expect(data.platformData).toEqual({
        accountType: 'Email',
        githubConnected: false,
        githubUsername: null
      })
    })

    it('should handle user with undefined user_metadata', async () => {
      const userWithUndefinedMetadata = {
        id: 'user_101',
        email: 'undefined@example.com'
      }
      mockAuth.mockResolvedValue({ user: userWithUndefinedMetadata })

      const response = await GET()
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.metadata.userMetadata).toEqual({})
      expect(data.platformData.githubConnected).toBe(false)
    })

    it('should handle authentication errors', async () => {
      const authError = new Error('Auth service unavailable')
      mockAuth.mockRejectedValue(authError)

      const response = await GET()
      const data = await response.json()

      expect(response.status).toBe(500)
      expect(data).toEqual({ error: 'Failed to generate data export' })
      expect(mockLogger.error).toHaveBeenCalledWith('Error generating data export:', {
        data: authError,
        tags: { type: 'privacy' }
      })
    })

    it('should handle JSON serialization errors', async () => {
      // Create a user with circular reference to cause JSON serialization error
      const circularUser = {
        id: 'user_circular',
        email: 'circular@example.com',
        user_metadata: {}
      }
      // Add circular reference
      circularUser.user_metadata = { self: circularUser }

      mockAuth.mockResolvedValue({ user: circularUser })

      const response = await GET()
      const data = await response.json()

      expect(response.status).toBe(500)
      expect(data).toEqual({ error: 'Failed to generate data export' })
      expect(mockLogger.error).toHaveBeenCalled()
    })

    it('should include correct privacy notice fields', async () => {
      mockAuth.mockResolvedValue({ user: mockUser })

      const response = await GET()
      const data = await response.json()

      expect(data.privacyNotice).toEqual({
        message: 'This export contains all personal data we have stored about your account.',
        dataTypes: [
          'Account information (email, name, creation date)',
          'Authentication provider data (GitHub connection)',
          'User preferences and metadata',
          'Login history timestamps'
        ],
        retention: 'You can request deletion of this data at any time through account settings.',
        contact: 'For questions about your data, please contact us through the platform.'
      })
    })

    it('should generate valid ISO date for export timestamp', async () => {
      mockAuth.mockResolvedValue({ user: mockUser })

      const response = await GET()
      const data = await response.json()

      expect(data.exportDate).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/)
      expect(new Date(data.exportDate).toISOString()).toBe(data.exportDate)
    })

    it('should calculate export size correctly', async () => {
      mockAuth.mockResolvedValue({ user: mockUser })

      await GET()

      expect(mockLogger.info).toHaveBeenCalledWith(
        'Data export generated',
        expect.objectContaining({
          data: expect.objectContaining({
            exportSize: expect.any(Number)
          })
        })
      )

      const logCall = mockLogger.info.mock.calls[0][1] as any
      expect(logCall?.data?.exportSize).toBeGreaterThan(0)
    })
  })
})
