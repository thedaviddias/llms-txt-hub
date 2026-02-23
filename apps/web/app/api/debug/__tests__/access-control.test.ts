import { POST as clearGithubCache } from '@/app/api/debug/clear-github-cache/route'
import { GET as getContentPaths } from '@/app/api/debug/content-paths/route'

jest.mock('@thedaviddias/auth', () => ({
  auth: jest.fn()
}))

jest.mock('@thedaviddias/logging', () => ({
  logger: {
    error: jest.fn(),
    info: jest.fn(),
    warn: jest.fn()
  }
}))

jest.mock('@/lib/github-security-utils', () => ({
  GitHubAPIClient: {
    getInstance: jest.fn(() => ({
      clearRateLimitCache: jest.fn()
    }))
  }
}))

const { auth } = require('@thedaviddias/auth')
const mockAuth = auth as jest.MockedFunction<any>

describe('/api/debug route access control', () => {
  const env = process.env as Record<string, string | undefined>
  const originalNodeEnv = env.NODE_ENV
  const originalDebugToken = env.DEBUG_API_TOKEN

  afterEach(() => {
    env.NODE_ENV = originalNodeEnv
    env.DEBUG_API_TOKEN = originalDebugToken
    jest.clearAllMocks()
  })

  it('returns 404 in production for debug content-paths endpoint', async () => {
    env.NODE_ENV = 'production'
    mockAuth.mockResolvedValue({ user: { id: 'user_123' } })

    const response = await getContentPaths(
      new Request('http://localhost/api/debug/content-paths') as any
    )
    const data = await response.json()

    expect(response.status).toBe(404)
    expect(data.error).toBe('Not found')
  })

  it('returns 401 for debug content-paths endpoint when unauthenticated in development', async () => {
    env.NODE_ENV = 'development'
    mockAuth.mockResolvedValue(null)

    const response = await getContentPaths(
      new Request('http://localhost/api/debug/content-paths') as any
    )
    const data = await response.json()

    expect(response.status).toBe(401)
    expect(data.error).toBe('Unauthorized')
  })

  it('returns 404 in production for debug cache clear endpoint', async () => {
    env.NODE_ENV = 'production'
    mockAuth.mockResolvedValue({ user: { id: 'user_123' } })

    const response = await clearGithubCache(
      new Request('http://localhost/api/debug/clear-github-cache', { method: 'POST' }) as any
    )
    const data = await response.json()

    expect(response.status).toBe(404)
    expect(data.error).toBe('Not found')
  })

  it('returns 401 for debug cache clear endpoint when unauthenticated in development', async () => {
    env.NODE_ENV = 'development'
    mockAuth.mockResolvedValue(null)

    const response = await clearGithubCache(
      new Request('http://localhost/api/debug/clear-github-cache', { method: 'POST' }) as any
    )
    const data = await response.json()

    expect(response.status).toBe(401)
    expect(data.error).toBe('Unauthorized')
  })

  it('returns 403 when DEBUG_API_TOKEN is configured but missing from request', async () => {
    env.NODE_ENV = 'development'
    env.DEBUG_API_TOKEN = 'secret-token'
    mockAuth.mockResolvedValue({ user: { id: 'user_123' } })

    const response = await clearGithubCache(
      new Request('http://localhost/api/debug/clear-github-cache', { method: 'POST' }) as any
    )
    const data = await response.json()

    expect(response.status).toBe(403)
    expect(data.error).toBe('Forbidden')
  })

  it('allows request when DEBUG_API_TOKEN matches', async () => {
    env.NODE_ENV = 'development'
    env.DEBUG_API_TOKEN = 'secret-token'
    mockAuth.mockResolvedValue({ user: { id: 'user_123' } })

    const response = await clearGithubCache(
      new Request('http://localhost/api/debug/clear-github-cache', {
        method: 'POST',
        headers: { 'x-debug-token': 'secret-token' }
      }) as any
    )
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data.message).toBe('GitHub API cache cleared successfully')
  })
})
