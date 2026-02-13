import type { User } from '@clerk/nextjs/server'
import { canUserSubmitViaGitHub, getUserAuthInfo, isEmailOnlyUser } from '@/lib/auth-utils'

// Create mock types that include all required properties
type MockEmailAddress = {
  id: string
  emailAddress: string
  verification: { status: string }
  linkedTo: any[]
}

type MockExternalAccount = {
  id: string
  identificationId: string
  externalId: string
  approvedScopes: string
  provider: string
  emailAddress: string
  firstName: string
  lastName: string
  imageUrl: string
  username: string
  publicMetadata: Record<string, any>
  label: string
  verification: { status: string }
}

type MockUser = Pick<User, 'id' | 'username' | 'publicMetadata'> & {
  emailAddresses: MockEmailAddress[]
  externalAccounts: MockExternalAccount[]
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
      const mockUser: MockUser = {
        id: 'user_123',
        emailAddresses: [
          {
            id: 'email_1',
            emailAddress: 'test@example.com',
            verification: { status: 'verified' },
            linkedTo: []
          }
        ],
        externalAccounts: [
          {
            id: 'ext_1',
            identificationId: 'ident_1',
            externalId: 'ext_id_1',
            approvedScopes: 'read:user',
            provider: 'oauth_github',
            emailAddress: 'test@example.com',
            firstName: 'Test',
            lastName: 'User',
            imageUrl: 'https://example.com/avatar.jpg',
            username: 'testuser',
            publicMetadata: {},
            label: 'GitHub',
            verification: { status: 'verified' }
          }
        ],
        username: 'testuser',
        publicMetadata: {}
      }

      const result = getUserAuthInfo(mockUser as User)

      expect(result).toEqual({
        authLevel: 'github_connected',
        canSubmitPR: true,
        githubConnected: true,
        email: 'test@example.com',
        githubUsername: 'testuser'
      })
    })

    it('should return correct auth data for email-only user', () => {
      const mockUser: MockUser = {
        id: 'user_456',
        emailAddresses: [
          {
            id: 'email_2',
            emailAddress: 'email@example.com',
            verification: { status: 'verified' },
            linkedTo: []
          }
        ],
        externalAccounts: [],
        username: null,
        publicMetadata: {}
      }

      const result = getUserAuthInfo(mockUser as User)

      expect(result).toEqual({
        authLevel: 'email_only',
        canSubmitPR: false,
        githubConnected: false,
        email: 'email@example.com',
        githubUsername: null
      })
    })

    it('should handle user with explicit canSubmitPR metadata', () => {
      const mockUser: MockUser = {
        id: 'user_789',
        emailAddresses: [
          {
            id: 'email_3',
            emailAddress: 'vip@example.com',
            verification: { status: 'verified' },
            linkedTo: []
          }
        ],
        externalAccounts: [],
        username: null,
        publicMetadata: { canSubmitPR: true, authLevel: 'github_full' }
      }

      const result = getUserAuthInfo(mockUser as User)

      expect(result).toEqual({
        authLevel: 'github_full',
        canSubmitPR: true,
        githubConnected: false,
        email: 'vip@example.com',
        githubUsername: null
      })
    })

    it('should default to email_only for invalid auth level', () => {
      const mockUser: MockUser = {
        id: 'user_invalid',
        emailAddresses: [
          {
            id: 'email_4',
            emailAddress: 'test@example.com',
            verification: { status: 'verified' },
            linkedTo: []
          }
        ],
        externalAccounts: [],
        username: null,
        publicMetadata: { authLevel: 'invalid_level' }
      }

      const result = getUserAuthInfo(mockUser as User)

      expect(result).toEqual({
        authLevel: 'email_only',
        canSubmitPR: false,
        githubConnected: false,
        email: 'test@example.com',
        githubUsername: null
      })
    })

    it('should handle user without email addresses', () => {
      const mockUser: MockUser = {
        id: 'user_no_email',
        emailAddresses: [],
        externalAccounts: [
          {
            id: 'ext_2',
            identificationId: 'ident_2',
            externalId: 'ext_id_2',
            approvedScopes: 'read:user',
            provider: 'oauth_github',
            emailAddress: 'noemail@example.com',
            firstName: 'No',
            lastName: 'Email',
            imageUrl: 'https://example.com/avatar2.jpg',
            username: 'noemailtuser',
            publicMetadata: {},
            label: 'GitHub',
            verification: { status: 'verified' }
          }
        ],
        username: 'noemailtuser',
        publicMetadata: {}
      }

      const result = getUserAuthInfo(mockUser as User)

      expect(result).toEqual({
        authLevel: 'github_connected',
        canSubmitPR: true,
        githubConnected: true,
        email: null,
        githubUsername: 'noemailtuser'
      })
    })

    it('should handle user with non-GitHub OAuth', () => {
      const mockUser: MockUser = {
        id: 'user_oauth',
        emailAddresses: [
          {
            id: 'email_5',
            emailAddress: 'oauth@example.com',
            verification: { status: 'verified' },
            linkedTo: []
          }
        ],
        externalAccounts: [
          {
            id: 'ext_3',
            identificationId: 'ident_3',
            externalId: 'ext_id_3',
            approvedScopes: 'email profile',
            provider: 'google',
            emailAddress: 'oauth@example.com',
            firstName: 'OAuth',
            lastName: 'User',
            imageUrl: 'https://example.com/avatar3.jpg',
            username: 'oauthuser',
            publicMetadata: {},
            label: 'Google',
            verification: { status: 'verified' }
          }
        ],
        username: null,
        publicMetadata: {}
      }

      const result = getUserAuthInfo(mockUser as User)

      expect(result).toEqual({
        authLevel: 'email_only',
        canSubmitPR: false,
        githubConnected: false,
        email: 'oauth@example.com',
        githubUsername: null
      })
    })

    it('should handle empty publicMetadata', () => {
      const mockUser: MockUser = {
        id: 'user_empty_meta',
        emailAddresses: [
          {
            id: 'email_6',
            emailAddress: 'empty@example.com',
            verification: { status: 'verified' },
            linkedTo: []
          }
        ],
        externalAccounts: [],
        username: null,
        publicMetadata: {}
      }

      const result = getUserAuthInfo(mockUser as User)

      expect(result).toEqual({
        authLevel: 'email_only',
        canSubmitPR: false,
        githubConnected: false,
        email: 'empty@example.com',
        githubUsername: null
      })
    })

    it('should handle missing publicMetadata', () => {
      const mockUser: MockUser = {
        id: 'user_no_meta',
        emailAddresses: [
          {
            id: 'email_7',
            emailAddress: 'nometa@example.com',
            verification: { status: 'verified' },
            linkedTo: []
          }
        ],
        externalAccounts: [],
        username: null,
        publicMetadata: {}
      }

      const result = getUserAuthInfo(mockUser as User)

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
      const mockUser: MockUser = {
        id: 'user_123',
        emailAddresses: [
          {
            id: 'email_8',
            emailAddress: 'test@example.com',
            verification: { status: 'verified' },
            linkedTo: []
          }
        ],
        externalAccounts: [
          {
            id: 'ext_4',
            identificationId: 'ident_4',
            externalId: 'ext_id_4',
            approvedScopes: 'read:user',
            provider: 'oauth_github',
            emailAddress: 'test@example.com',
            firstName: 'Test',
            lastName: 'User',
            imageUrl: 'https://example.com/avatar4.jpg',
            username: 'testuser',
            publicMetadata: {},
            label: 'GitHub',
            verification: { status: 'verified' }
          }
        ],
        username: 'testuser',
        publicMetadata: {}
      }

      const result = canUserSubmitViaGitHub(mockUser as User)
      expect(result).toBe(true)
    })

    it('should return false for email-only user', () => {
      const mockUser: MockUser = {
        id: 'user_456',
        emailAddresses: [
          {
            id: 'email_9',
            emailAddress: 'email@example.com',
            verification: { status: 'verified' },
            linkedTo: []
          }
        ],
        externalAccounts: [],
        username: null,
        publicMetadata: {}
      }

      const result = canUserSubmitViaGitHub(mockUser as User)
      expect(result).toBe(false)
    })

    it('should return false for null user', () => {
      const result = canUserSubmitViaGitHub(null)
      expect(result).toBe(false)
    })
  })

  describe('isEmailOnlyUser', () => {
    it('should return true for email-only user', () => {
      const mockUser: MockUser = {
        id: 'user_456',
        emailAddresses: [
          {
            id: 'email_10',
            emailAddress: 'email@example.com',
            verification: { status: 'verified' },
            linkedTo: []
          }
        ],
        externalAccounts: [],
        username: null,
        publicMetadata: {}
      }

      const result = isEmailOnlyUser(mockUser as User)
      expect(result).toBe(true)
    })

    it('should return false for GitHub user', () => {
      const mockUser: MockUser = {
        id: 'user_123',
        emailAddresses: [
          {
            id: 'email_11',
            emailAddress: 'test@example.com',
            verification: { status: 'verified' },
            linkedTo: []
          }
        ],
        externalAccounts: [
          {
            id: 'ext_5',
            identificationId: 'ident_5',
            externalId: 'ext_id_5',
            approvedScopes: 'read:user',
            provider: 'oauth_github',
            emailAddress: 'test@example.com',
            firstName: 'Test',
            lastName: 'User',
            imageUrl: 'https://example.com/avatar5.jpg',
            username: 'testuser',
            publicMetadata: {},
            label: 'GitHub',
            verification: { status: 'verified' }
          }
        ],
        username: 'testuser',
        publicMetadata: {}
      }

      const result = isEmailOnlyUser(mockUser as User)
      expect(result).toBe(false)
    })

    it('should return false for null user', () => {
      const result = isEmailOnlyUser(null)
      expect(result).toBe(false)
    })
  })
})
