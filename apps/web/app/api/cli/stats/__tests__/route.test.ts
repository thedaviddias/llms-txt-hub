import { createMockRequest } from '@/app/api/__tests__/test-helpers'
import { GET } from '@/app/api/cli/stats/[slug]/route'

const mockHget = jest.fn()

const mockRedisClient = {
  hget: mockHget
}

jest.mock('@/lib/redis', () => ({
  __esModule: true,
  getRawClient: jest.fn(() => mockRedisClient)
}))

function callGET(slug: string) {
  const request = createMockRequest(`/api/cli/stats/${slug}`)
  return GET(request, { params: Promise.resolve({ slug }) })
}

describe('/api/cli/stats/[slug]', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('returns the install count for a valid slug', async () => {
    mockHget.mockResolvedValue(42)

    const response = await callGET('astro')
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data.count).toBe(42)
    expect(mockHget).toHaveBeenCalledWith('telemetry:skills:total', 'astro')
  })

  it('returns 0 for a slug with no installs', async () => {
    mockHget.mockResolvedValue(null)

    const response = await callGET('unknown-skill')
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data.count).toBe(0)
  })

  it('returns 0 when Redis is unavailable', async () => {
    const { getRawClient } = require('@/lib/redis')
    ;(getRawClient as jest.Mock).mockReturnValueOnce(null)

    const response = await callGET('astro')
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data.count).toBe(0)
  })

  it('returns 0 on Redis errors', async () => {
    mockHget.mockRejectedValue(new Error('Connection failed'))

    const response = await callGET('astro')
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data.count).toBe(0)
  })

  it('sets cache headers for CDN caching', async () => {
    mockHget.mockResolvedValue(10)

    const response = await callGET('react')

    expect(response.headers.get('Cache-Control')).toBe(
      'public, s-maxage=300, stale-while-revalidate=600'
    )
  })
})
