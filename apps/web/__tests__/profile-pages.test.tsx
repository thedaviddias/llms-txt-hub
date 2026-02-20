import { useAuth } from '@thedaviddias/auth'
import { render, screen, waitFor } from '@/__tests__/utils/test-utils.helper'

const mockPush = jest.fn()
const mockReplace = jest.fn()

jest.mock('next/navigation', () => ({
  useRouter: jest.fn(() => ({
    push: mockPush,
    replace: mockReplace,
    back: jest.fn(),
    forward: jest.fn(),
    refresh: jest.fn(),
    prefetch: jest.fn()
  })),
  usePathname: jest.fn(() => '/profile'),
  useSearchParams: jest.fn(() => new URLSearchParams()),
  useParams: jest.fn(() => ({}))
}))

jest.mock('@thedaviddias/auth', () => ({
  useAuth: jest.fn()
}))

jest.mock('sonner', () => ({
  toast: {
    success: jest.fn(),
    error: jest.fn(),
    info: jest.fn()
  }
}))

jest.mock('@/components/profile/edit-profile-modal', () => ({
  EditProfileModal: () => null
}))

type AuthState = {
  user: any
  signOut: jest.Mock
  isLoaded: boolean
}

const mockUseAuth = useAuth as jest.MockedFunction<typeof useAuth>

function setAuthState(partial?: Partial<AuthState>) {
  mockUseAuth.mockReturnValue({
    user: {
      id: 'user_test',
      email: 'test@example.com',
      publicMetadata: {
        user_name: 'testuser'
      },
      user_metadata: {
        user_name: 'testuser'
      },
      externalAccounts: [{ provider: 'oauth_github' }]
    },
    signOut: jest.fn(),
    isLoaded: true,
    ...partial
  } as any)
}

describe('Profile pages', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    setAuthState()
  })

  it('renders profile settings for a loaded authenticated user', async () => {
    const ProfilePage = (await import('../app/profile/page')).default
    render(<ProfilePage />)

    expect(await screen.findByText('Profile Settings')).toBeTruthy()
    expect(screen.getByText('Manage your account settings and preferences')).toBeTruthy()
    expect(screen.getByText('GitHub Integration')).toBeTruthy()
    expect(screen.getByText('Connected')).toBeTruthy()
  })

  it('renders connect GitHub CTA when user has no GitHub external account', async () => {
    setAuthState({
      user: {
        id: 'user_test',
        email: 'test@example.com',
        publicMetadata: {},
        user_metadata: {},
        externalAccounts: []
      }
    })

    const ConnectGitHubPage = (await import('../app/auth/connect-github/page')).default
    render(<ConnectGitHubPage />)

    expect(screen.getByText('Connect Your GitHub Account')).toBeTruthy()
    expect(screen.getByText(/Benefits of connecting GitHub/i)).toBeTruthy()
  })

  it('renders connected state when GitHub is already linked', async () => {
    const ConnectGitHubPage = (await import('../app/auth/connect-github/page')).default
    render(<ConnectGitHubPage />)

    expect(screen.getByText('GitHub Connected!')).toBeTruthy()

    await waitFor(() => {
      expect(mockPush).toHaveBeenCalledWith('/profile?message=GitHub account already connected')
    })
  })

  it('shows loading state and redirects when auth user is missing', async () => {
    setAuthState({ user: null })

    const ConnectGitHubPage = (await import('../app/auth/connect-github/page')).default
    render(<ConnectGitHubPage />)

    expect(screen.getByText('Loading...')).toBeTruthy()

    await waitFor(() => {
      expect(mockPush).toHaveBeenCalledWith('/login?redirect=/auth/connect-github')
    })
  })
})
