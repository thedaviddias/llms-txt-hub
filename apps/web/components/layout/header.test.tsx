import { useAuth } from '@thedaviddias/auth'
import { Header, shouldShowAuthPlaceholder } from '@/components/layout/header'
import { render, screen } from '@/test/test-utils'

jest.mock('@thedaviddias/auth', () => ({ useAuth: jest.fn() }))
jest.mock('@/components/stats/github-stars', () => ({ GithubStars: () => null }))

describe('Header authentication hydration', () => {
  it('keeps the auth placeholder until mount and Clerk loading both complete', () => {
    expect(shouldShowAuthPlaceholder(false, true)).toBe(true)
    expect(shouldShowAuthPlaceholder(true, false)).toBe(true)
    expect(shouldShowAuthPlaceholder(true, true)).toBe(false)
  })

  it('renders signed-out navigation after mounting', async () => {
    jest.mocked(useAuth).mockReturnValue({
      getSession: jest.fn(),
      getUser: jest.fn(),
      isLoaded: true,
      isSignedIn: false,
      reloadUser: jest.fn(),
      signIn: jest.fn(),
      signOut: jest.fn(),
      user: null
    })

    render(<Header />)

    expect(await screen.findByRole('link', { name: 'Sign up' })).toBeVisible()
  })
})
