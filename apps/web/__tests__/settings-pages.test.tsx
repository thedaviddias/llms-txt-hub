/**
 * Tests for settings pages to ensure they load without errors
 */

import { render, screen } from '@/__tests__/utils/test-utils.helper'
import { jest } from '@jest/globals'

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
  usePathname: () => '/settings',
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
        github_username: 'testuser'
      }
    },
    signOut: jest.fn()
  })
}))

// Mock Clerk
jest.mock('@clerk/nextjs', () => ({
  useUser: () => ({
    user: {
      id: 'test-user-id',
      email: 'test@example.com',
      firstName: 'Test',
      lastName: 'User',
      username: 'testuser',
      publicMetadata: {},
      user_metadata: {
        github_username: 'testuser'
      }
    },
    isLoaded: true
  }),
  useClerk: () => ({})
}))

// Mock sonner
jest.mock('sonner', () => ({
  toast: {
    success: jest.fn(),
    error: jest.fn(),
    info: jest.fn()
  }
}))

describe('Settings Pages', () => {
  describe('Settings Layout', () => {
    it('should render settings layout without crashing', async () => {
      const SettingsLayout = (await import('../app/settings/layout')).default
      const { container } = render(
        <SettingsLayout>
          <div>Test Content</div>
        </SettingsLayout>
      )
      expect(container).toBeTruthy()
    })
  })

  describe('Account Settings Page', () => {
    it('should render account settings page without crashing', async () => {
      const AccountSettingsPage = (await import('../app/settings/account/page')).default
      render(<AccountSettingsPage />)

      // Check for key elements
      expect(screen.getByText('Account Settings')).toBeTruthy()
      expect(screen.getByText('Account Information')).toBeTruthy()
    })
  })

  describe('Privacy Settings Page', () => {
    it('should render privacy settings page without crashing', async () => {
      const PrivacySettingsPage = (await import('../app/settings/privacy/page')).default
      render(<PrivacySettingsPage />)

      // Check for key elements
      expect(screen.getByText('Privacy Settings')).toBeTruthy()
      expect(screen.getByText('Profile Visibility')).toBeTruthy()
    })
  })

  describe('Integrations Settings Page', () => {
    it('should render integrations settings page without crashing', async () => {
      const IntegrationsSettingsPage = (await import('../app/settings/integrations/page')).default
      render(<IntegrationsSettingsPage />)

      // Check for key elements
      expect(screen.getByText('Integrations')).toBeTruthy()
      expect(screen.getByText('GitHub')).toBeTruthy()
    })
  })

  describe('Notifications Settings Page', () => {
    it('should render notifications settings page without crashing', async () => {
      const NotificationsSettingsPage = (await import('../app/settings/notifications/page')).default
      render(<NotificationsSettingsPage />)

      // Check for key elements
      expect(screen.getByText('Notifications')).toBeTruthy()
      expect(screen.getByText('Newsletter')).toBeTruthy()
    })
  })

  describe('Settings Root Page', () => {
    it('should render settings root page without crashing', async () => {
      const SettingsPage = (await import('../app/settings/page')).default
      const { container } = render(<SettingsPage />)
      expect(container).toBeTruthy()
    })
  })
})
