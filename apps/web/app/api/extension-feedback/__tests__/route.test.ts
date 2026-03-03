import { logger } from '@thedaviddias/logging'
import { POST } from '@/app/api/extension-feedback/route'

jest.mock('@sentry/nextjs', () => ({
  captureException: jest.fn()
}))

jest.mock('@thedaviddias/logging', () => ({
  logger: {
    info: jest.fn(),
    error: jest.fn()
  }
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

describe('/api/extension-feedback', () => {
  beforeEach(() => {
    jest.clearAllMocks()
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
})
