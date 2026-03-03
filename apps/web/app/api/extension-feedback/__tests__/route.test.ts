import { logger } from '@thedaviddias/logging'
import { GET, POST } from '@/app/api/extension-feedback/route'
import { getRawClient } from '@/lib/redis'

jest.mock('@sentry/nextjs', () => ({
  captureException: jest.fn()
}))

jest.mock('@thedaviddias/logging', () => ({
  logger: {
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn()
  }
}))

jest.mock('@/lib/redis', () => ({
  getRawClient: jest.fn()
}))

const createRequest = (body: unknown, ip = '203.0.113.200') =>
  new Request('http://localhost/api/extension-feedback', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-forwarded-for': ip
    },
    body: JSON.stringify(body)
  })

const createGetRequest = (query = '', token?: string) =>
  new Request(`http://localhost/api/extension-feedback${query}`, {
    method: 'GET',
    headers: token
      ? {
          'x-feedback-token': token
        }
      : undefined
  })

describe('/api/extension-feedback', () => {
  const originalReadToken = process.env.EXTENSION_FEEDBACK_READ_TOKEN

  beforeEach(() => {
    jest.clearAllMocks()
    ;(getRawClient as jest.Mock).mockReturnValue(null)
    delete process.env.EXTENSION_FEEDBACK_READ_TOKEN
  })

  afterAll(() => {
    process.env.EXTENSION_FEEDBACK_READ_TOKEN = originalReadToken
  })

  it('accepts a valid uninstall feedback payload', async () => {
    const response = await POST(
      createRequest({
        event: 'uninstall',
        reason: 'Too noisy or distracting',
        comment: 'It interrupted my workflow.',
        version: '2.0.0',
        lang: 'en-US',
        submittedAt: '2026-03-03T20:00:00.000Z'
      }) as any
    )

    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data.ok).toBe(true)
    expect(logger.info).toHaveBeenCalled()
  })

  it('persists full feedback payload to redis when available', async () => {
    const pipeline = {
      lpush: jest.fn().mockReturnThis(),
      ltrim: jest.fn().mockReturnThis(),
      exec: jest.fn().mockResolvedValue([])
    }
    ;(getRawClient as jest.Mock).mockReturnValue({
      pipeline: () => pipeline
    })

    const response = await POST(
      createRequest({
        event: 'uninstall',
        reason: 'Missing key features',
        comment: 'Please add per-site exclusions.',
        version: '2.1.0',
        lang: 'en-US',
        submittedAt: '2026-03-03T20:00:00.000Z'
      }) as any
    )

    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data.ok).toBe(true)
    expect(pipeline.lpush).toHaveBeenCalledWith(
      'extension-feedback:uninstall:v1',
      expect.stringContaining('"comment":"Please add per-site exclusions."')
    )
    expect(pipeline.ltrim).toHaveBeenCalledWith('extension-feedback:uninstall:v1', 0, 999)
    expect(pipeline.exec).toHaveBeenCalled()
  })

  it('rejects payloads with missing reason', async () => {
    const response = await POST(
      createRequest({
        event: 'uninstall',
        version: '2.0.0',
        submittedAt: '2026-03-03T20:00:00.000Z'
      }) as any
    )

    const data = await response.json()

    expect(response.status).toBe(400)
    expect(data.ok).toBe(false)
    expect(data.error).toBe('Invalid feedback payload')
  })

  it('rejects payloads when comment exceeds max length', async () => {
    const response = await POST(
      createRequest({
        event: 'uninstall',
        reason: 'Other',
        comment: 'a'.repeat(1001),
        submittedAt: '2026-03-03T20:00:00.000Z'
      }) as any
    )

    const data = await response.json()

    expect(response.status).toBe(400)
    expect(data.ok).toBe(false)
  })

  it('applies per-IP rate limiting', async () => {
    const ip = '203.0.113.77'

    for (let i = 0; i < 10; i++) {
      const allowed = await POST(
        createRequest(
          {
            event: 'uninstall',
            reason: 'I only needed it temporarily',
            submittedAt: '2026-03-03T20:00:00.000Z'
          },
          ip
        ) as any
      )
      expect(allowed.status).toBe(200)
    }

    const blocked = await POST(
      createRequest(
        {
          event: 'uninstall',
          reason: 'I only needed it temporarily',
          submittedAt: '2026-03-03T20:00:00.000Z'
        },
        ip
      ) as any
    )

    const data = await blocked.json()

    expect(blocked.status).toBe(429)
    expect(data.ok).toBe(false)
    expect(data.error).toBe('Rate limit exceeded. Please try again later.')
  })

  it('returns a safe 500 response for unexpected failures', async () => {
    ;(logger.info as jest.Mock).mockImplementationOnce(() => {
      throw new Error('unexpected logger failure')
    })

    const response = await POST(
      createRequest({
        event: 'uninstall',
        reason: 'Other',
        submittedAt: '2026-03-03T20:00:00.000Z'
      }) as any
    )

    const data = await response.json()

    expect(response.status).toBe(500)
    expect(data.ok).toBe(false)
    expect(data.error).toBe('Unable to process feedback right now. Please try again later.')
    expect(logger.error).toHaveBeenCalled()
  })

  it('returns 404 for feedback list when read token is not configured', async () => {
    const response = await GET(createGetRequest('?limit=5') as any)
    const data = await response.json()

    expect(response.status).toBe(404)
    expect(data.ok).toBe(false)
    expect(data.error).toBe('Not found')
  })

  it('returns 401 for feedback list when token is invalid', async () => {
    process.env.EXTENSION_FEEDBACK_READ_TOKEN = 'secret-read-token'

    const response = await GET(createGetRequest('?limit=5', 'wrong-token') as any)
    const data = await response.json()

    expect(response.status).toBe(401)
    expect(data.ok).toBe(false)
    expect(data.error).toBe('Unauthorized')
  })

  it('returns full feedback entries when token is valid', async () => {
    process.env.EXTENSION_FEEDBACK_READ_TOKEN = 'secret-read-token'
    ;(getRawClient as jest.Mock).mockReturnValue({
      lrange: jest.fn().mockResolvedValue([
        JSON.stringify({
          id: 'fb_1',
          event: 'uninstall',
          reason: 'Too noisy or distracting',
          comment: 'Need quieter defaults on local sites.',
          version: '2.1.0',
          lang: 'en-US',
          submittedAt: '2026-03-03T20:00:00.000Z',
          receivedAt: '2026-03-03T20:00:05.000Z'
        })
      ])
    })

    const response = await GET(createGetRequest('?limit=1', 'secret-read-token') as any)
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data.ok).toBe(true)
    expect(data.count).toBe(1)
    expect(data.feedback[0].comment).toBe('Need quieter defaults on local sites.')
  })
})
