import { canUserSubmitViaGitHub, getUserAuthInfo, isEmailOnlyUser } from '@/lib/auth-utils'

// Mock the Clerk user object structure
interface MockClerkUser {
  id: string
  emailAddresses?: Array<{ emailAddress: string }>
  externalAccounts?: Array<{ provider: string; username?: string }>
  username?: string | null
  publicMetadata?: Record<string, any>
}

describe('auth-utils', () => {
  describe('getUserAuthInfo', () => {
    it('should return anonymous data when no user provided', () => {
      const result = getUserAuthInfo(null)

      expect(result).toEqual({
        authLevel: 'anonymous',
        canSubmitPR: false,
        githubConnected: false,
        email: null
      })
    })

    it('should return correct auth data for GitHub user', () => {
      const mockUser: MockClerkUser = {
        id: 'user_123',
        emailAddresses: [{ emailAddress: 'test@example.com' }],
        externalAccounts: [{ provider: 'oauth_github' }],
        username: 'testuser',
        publicMetadata: {}
      }

      const result = getUserAuthInfo(mockUser)

      expect(result).toEqual({
        authLevel: 'github_connected',
        canSubmitPR: true,
        githubConnected: true,
        email: 'test@example.com',
        githubUsername: 'testuser'
      })
    })

    it('should return correct auth data for email-only user', () => {
      const mockUser: MockClerkUser = {
        id: 'user_456',
        emailAddresses: [{ emailAddress: 'email@example.com' }],
        externalAccounts: [],
        username: null,
        publicMetadata: {}
      }

      const result = getUserAuthInfo(mockUser)

      expect(result).toEqual({
        authLevel: 'email_only',
        canSubmitPR: false,
        githubConnected: false,
        email: 'email@example.com',
        githubUsername: null
      })
    })

    it('should handle user with explicit canSubmitPR metadata', () => {
      const mockUser: MockClerkUser = {
        id: 'user_789',
        emailAddresses: [{ emailAddress: 'vip@example.com' }],
        externalAccounts: [],
        username: null,
        publicMetadata: { canSubmitPR: true, authLevel: 'github_full' }
      }

      const result = getUserAuthInfo(mockUser)

      expect(result).toEqual({
        authLevel: 'github_full',
        canSubmitPR: true,
        githubConnected: false,
        email: 'vip@example.com',
        githubUsername: null
      })
    })

    it('should default to email_only for invalid auth level', () => {
      const mockUser: MockClerkUser = {
        id: 'user_invalid',
        emailAddresses: [{ emailAddress: 'test@example.com' }],
        externalAccounts: [],
        username: null,
        publicMetadata: { authLevel: 'invalid_level' }
      }

      const result = getUserAuthInfo(mockUser)

      expect(result).toEqual({
        authLevel: 'email_only',
        canSubmitPR: false,
        githubConnected: false,
        email: 'test@example.com',
        githubUsername: null
      })
    })

    it('should handle user without email addresses', () => {
      const mockUser: MockClerkUser = {
        id: 'user_no_email',
        emailAddresses: [],
        externalAccounts: [{ provider: 'oauth_github' }],
        username: 'noemailtuser',
        publicMetadata: {}
      }

      const result = getUserAuthInfo(mockUser)

      expect(result).toEqual({
        authLevel: 'github_connected',
        canSubmitPR: true,
        githubConnected: true,
        email: null,
        githubUsername: 'noemailtuser'
      })
    })

    it('should handle user with non-GitHub OAuth', () => {
      const mockUser: MockClerkUser = {
        id: 'user_oauth',
        emailAddresses: [{ emailAddress: 'oauth@example.com' }],
        externalAccounts: [{ provider: 'google' }],
        username: null,
        publicMetadata: {}
      }

      const result = getUserAuthInfo(mockUser)

      expect(result).toEqual({
        authLevel: 'email_only',
        canSubmitPR: false,
        githubConnected: false,
        email: 'oauth@example.com',
        githubUsername: null
      })
    })

    it('should handle empty publicMetadata', () => {
      const mockUser: MockClerkUser = {
        id: 'user_empty_meta',
        emailAddresses: [{ emailAddress: 'empty@example.com' }],
        externalAccounts: [],
        username: null,
        publicMetadata: {}
      }

      const result = getUserAuthInfo(mockUser)

      expect(result).toEqual({
        authLevel: 'email_only',
        canSubmitPR: false,
        githubConnected: false,
        email: 'empty@example.com',
        githubUsername: null
      })
    })

    it('should handle missing publicMetadata', () => {
      const mockUser: MockClerkUser = {
        id: 'user_no_meta',
        emailAddresses: [{ emailAddress: 'nometa@example.com' }],
        externalAccounts: [],
        username: null
      }

      const result = getUserAuthInfo(mockUser)

      expect(result).toEqual({
        authLevel: 'email_only',
        canSubmitPR: false,
        githubConnected: false,
        email: 'nometa@example.com',
        githubUsername: null
      })
    })
  })

  describe('canUserSubmitViaGitHub', () => {
    it('should return true for GitHub user with permissions', () => {
      const mockUser: MockClerkUser = {
        id: 'user_123',
        emailAddresses: [{ emailAddress: 'test@example.com' }],
        externalAccounts: [{ provider: 'oauth_github' }],
        username: 'testuser',
        publicMetadata: {}
      }

      const result = canUserSubmitViaGitHub(mockUser)
      expect(result).toBe(true)
    })

    it('should return false for email-only user', () => {
      const mockUser: MockClerkUser = {
        id: 'user_456',
        emailAddresses: [{ emailAddress: 'email@example.com' }],
        externalAccounts: [],
        username: null,
        publicMetadata: {}
      }

      const result = canUserSubmitViaGitHub(mockUser)
      expect(result).toBe(false)
    })

    it('should return false for null user', () => {
      const result = canUserSubmitViaGitHub(null)
      expect(result).toBe(false)
    })
  })

  describe('isEmailOnlyUser', () => {
    it('should return true for email-only user', () => {
      const mockUser: MockClerkUser = {
        id: 'user_456',
        emailAddresses: [{ emailAddress: 'email@example.com' }],
        externalAccounts: [],
        username: null,
        publicMetadata: {}
      }

      const result = isEmailOnlyUser(mockUser)
      expect(result).toBe(true)
    })

    it('should return false for GitHub user', () => {
      const mockUser: MockClerkUser = {
        id: 'user_123',
        emailAddresses: [{ emailAddress: 'test@example.com' }],
        externalAccounts: [{ provider: 'oauth_github' }],
        username: 'testuser',
        publicMetadata: {}
      }

      const result = isEmailOnlyUser(mockUser)
      expect(result).toBe(false)
    })

    it('should return false for null user', () => {
      const result = isEmailOnlyUser(null)
      expect(result).toBe(false)
    })
  })
})
