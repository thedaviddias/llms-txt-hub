/**
 * Tests for API routes
 */

import { jest } from '@jest/globals'

// Mock auth
jest.mock('@thedaviddias/auth', () => ({
  auth: jest.fn()
}))

// Mock logger
jest.mock('@thedaviddias/logging', () => ({
  logger: {
    info: jest.fn(),
    error: jest.fn(),
    warn: jest.fn()
  }
}))

describe('API Routes', () => {
  describe('/api/user/export-data', () => {
    it('should return 401 when user is not authenticated', async () => {
      const auth = require('@thedaviddias/auth').auth
      auth.mockResolvedValueOnce(null)

      const { GET } = await import('../app/api/user/export-data/route')
      const response = await GET()

      expect(response.status).toBe(401)
      const data = await response.json()
      expect(data.error).toBe('Authentication required')
    })

    it('should return user data when authenticated', async () => {
      const auth = require('@thedaviddias/auth').auth
      auth.mockResolvedValueOnce({
        user: {
          id: 'test-user-id',
          email: 'test@example.com',
          user_metadata: {
            github_username: 'testuser',
            user_name: 'testuser'
          }
        }
      })

      const { GET } = await import('../app/api/user/export-data/route')
      const response = await GET()

      expect(response.status).toBe(200)
      const data = await response.json()

      // Check structure of exported data
      expect(data).toHaveProperty('exportDate')
      expect(data).toHaveProperty('exportVersion')
      expect(data).toHaveProperty('account')
      expect(data.account.id).toBe('test-user-id')
      expect(data.account.email).toBe('test@example.com')
      expect(data).toHaveProperty('metadata')
      expect(data).toHaveProperty('platformData')
      expect(data.platformData.githubConnected).toBe(true)
      expect(data.platformData.githubUsername).toBe('testuser')
    })
  })

  describe('/api/user/delete-account', () => {
    it('should return 401 when user is not authenticated', async () => {
      const auth = require('@thedaviddias/auth').auth
      auth.mockResolvedValueOnce(null)

      const { DELETE } = await import('../app/api/user/delete-account/route')
      const response = await DELETE()

      expect(response.status).toBe(401)
      const data = await response.json()
      expect(data.error).toBe('Unauthorized')
    })
  })
})
