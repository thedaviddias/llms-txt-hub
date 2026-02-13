/**
 * Tests for profile-related pages to ensure they load without errors
 */

import { jest } from '@jest/globals'
import * as Auth from '@thedaviddias/auth'
import { render, screen } from '@/__tests__/utils/test-utils.helper'

// Mock next/navigation
jest.mock('next/navigation', () => ({
  useRouter: () => ({
    push: jest.fn(),
    replace: jest.fn(),
    back: jest.fn(),
    forward: jest.fn(),
    refresh: jest.fn(),
    prefetch: jest.fn()
  }),
  usePathname: () => '/profile',
  useSearchParams: () => new URLSearchParams(),
  useParams: () => ({})
}))

// Mock auth
jest.mock('@thedaviddias/auth', () => ({
  useAuth: () => ({
    user: {
      id: 'test-user-id',
      email: 'test@example.com',
      user_metadata: {
        github_username: 'testuser',
        user_name: 'testuser'
      }
    },
    signOut: jest.fn()
  })
}))

// Mock sonner
jest.mock('sonner', () => ({
  toast: {
    success: jest.fn(),
    error: jest.fn(),
    info: jest.fn()
  }
}))

describe.skip('Profile Pages', () => {
  describe('Profile Page', () => {
    it('should render profile page without crashing', async () => {
      const ProfilePage = (await import('../app/profile/page')).default
      render(<ProfilePage />)

      // Check for key elements
      expect(screen.getByText('Profile Settings')).toBeTruthy()
      expect(screen.getByText('Account Overview')).toBeTruthy()
    })

    it('should show GitHub connected status when user has GitHub auth', async () => {
      const ProfilePage = (await import('../app/profile/page')).default
      render(<ProfilePage />)

      // Check for GitHub integration section
      expect(screen.getByText('GitHub Integration')).toBeTruthy()
      expect(screen.getByText('Connected')).toBeTruthy()
    })
  })

  describe('Connect GitHub Page', () => {
    it('should render connect GitHub page without crashing', async () => {
      // Mock auth without GitHub for this test
      jest.spyOn(Auth, 'useAuth').mockReturnValueOnce({
        user: {
          id: 'test-user-id',
          email: 'test@example.com',
          user_metadata: {}
        },
        signOut: jest.fn() as () => Promise<void>,
        isLoaded: true,
        isSignedIn: true,
        signIn: jest.fn(),
        getSession: jest.fn(),
        getToken: jest.fn(),
        openSignIn: jest.fn()
      } as any)

      const ConnectGitHubPage = (await import('../app/auth/connect-github/page')).default
      render(<ConnectGitHubPage />)

      // Check for key elements
      expect(screen.getByText('Connect Your GitHub Account')).toBeTruthy()
      expect(screen.getByText(/Benefits of connecting GitHub/)).toBeTruthy()
    })

    it('should show already connected message when user has GitHub', async () => {
      const ConnectGitHubPage = (await import('../app/auth/connect-github/page')).default
      render(<ConnectGitHubPage />)

      // Should show connected status
      expect(screen.getByText('GitHub Connected!')).toBeTruthy()
    })
  })
})
