import { DELETE } from '@/app/api/user/delete-account/route'
import { logger } from '@thedaviddias/logging'

// Mock dependencies
jest.mock('@clerk/backend', () => {
  const mockClerk = {
    users: {
      deleteUser: jest.fn()
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

describe('/api/user/delete-account', () => {
  const mockUserId = 'user_123'

  beforeEach(() => {
    jest.clearAllMocks()
    // Reset mock implementations
    mockClerk.users.deleteUser.mockResolvedValue(undefined)
  })

  describe('DELETE /api/user/delete-account', () => {
    it('should successfully delete user account', async () => {
      mockAuth.mockResolvedValue({ user: { id: mockUserId } })
      mockClerk.users.deleteUser.mockResolvedValue(undefined)

      const response = await DELETE()
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data).toEqual({
        success: true,
        message: 'Account deleted successfully'
      })
      expect(mockClerk.users.deleteUser).toHaveBeenCalledWith(mockUserId)
    })

    it('should return 401 when user is not authenticated', async () => {
      mockAuth.mockResolvedValue({ user: null })

      const response = await DELETE()
      const data = await response.json()

      expect(response.status).toBe(401)
      expect(data).toEqual({ error: 'Unauthorized' })
      expect(mockClerk.users.deleteUser).not.toHaveBeenCalled()
    })

    it('should return 401 when session has no user ID', async () => {
      mockAuth.mockResolvedValue({ user: { id: null } })

      const response = await DELETE()
      const data = await response.json()

      expect(response.status).toBe(401)
      expect(data).toEqual({ error: 'Unauthorized' })
      expect(mockClerk.users.deleteUser).not.toHaveBeenCalled()
    })

    it('should handle user not found error gracefully', async () => {
      const notFoundError = new Error('User not found')
      mockAuth.mockResolvedValue({ user: { id: mockUserId } })
      mockClerk.users.deleteUser.mockRejectedValue(notFoundError)

      const response = await DELETE()
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data).toEqual({
        success: true,
        message: 'Account already deleted'
      })
      expect(mockLogger.error).toHaveBeenCalledWith('Error deleting user account:', {
        data: notFoundError,
        tags: { type: 'api' }
      })
    })

    it('should handle Clerk API errors', async () => {
      const clerkError = new Error('Clerk API error')
      mockAuth.mockResolvedValue({ user: { id: mockUserId } })
      mockClerk.users.deleteUser.mockRejectedValue(clerkError)

      const response = await DELETE()
      const data = await response.json()

      expect(response.status).toBe(500)
      expect(data).toEqual({
        error: 'Failed to delete account. Please contact support.'
      })
      expect(mockLogger.error).toHaveBeenCalledWith('Error deleting user account:', {
        data: clerkError,
        tags: { type: 'api' }
      })
    })

    it('should handle authentication errors', async () => {
      const authError = new Error('Auth service unavailable')
      mockAuth.mockRejectedValue(authError)

      const response = await DELETE()
      const data = await response.json()

      expect(response.status).toBe(500)
      expect(data).toEqual({
        error: 'Failed to delete account. Please contact support.'
      })
      expect(mockLogger.error).toHaveBeenCalledWith('Error deleting user account:', {
        data: authError,
        tags: { type: 'api' }
      })
    })

    it('should handle generic errors', async () => {
      const genericError = new Error('Generic error')
      mockAuth.mockResolvedValue({ user: { id: mockUserId } })
      mockClerk.users.deleteUser.mockRejectedValue(genericError)

      const response = await DELETE()
      const data = await response.json()

      expect(response.status).toBe(500)
      expect(data).toEqual({
        error: 'Failed to delete account. Please contact support.'
      })
      expect(mockLogger.error).toHaveBeenCalledWith('Error deleting user account:', {
        data: genericError,
        tags: { type: 'api' }
      })
    })

    it('should call deleteUser with correct user ID', async () => {
      mockAuth.mockResolvedValue({ user: { id: mockUserId } })
      mockClerk.users.deleteUser.mockResolvedValue(undefined)

      await DELETE()

      expect(mockClerk.users.deleteUser).toHaveBeenCalledWith(mockUserId)
    })
  })
})
