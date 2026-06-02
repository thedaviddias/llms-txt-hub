import fs from 'node:fs'
import * as Sentry from '@sentry/nextjs'
import { GET } from '@/app/websites/[slug]/[file]/route'

jest.mock('node:fs', () => ({
  existsSync: jest.fn(),
  readFileSync: jest.fn()
}))

jest.mock('@sentry/nextjs', () => ({
  captureException: jest.fn(),
  captureMessage: jest.fn()
}))

jest.mock('next/server', () => {
  class NextResponse {
    status: number
    headers: Headers
    private body: BodyInit | null

    constructor(body?: BodyInit | null, init?: ResponseInit) {
      this.body = body ?? null
      this.status = init?.status ?? 200
      this.headers = new Headers(init?.headers)
    }

    async text() {
      return typeof this.body === 'string' ? this.body : ''
    }

    static json(data: unknown, init?: ResponseInit) {
      return new Response(JSON.stringify(data), {
        ...init,
        headers: {
          'content-type': 'application/json',
          ...(init?.headers || {})
        }
      })
    }
  }

  return { NextResponse }
})

jest.mock('@thedaviddias/caching/upstash', () => ({
  UpstashCache: jest.fn().mockImplementation(() => ({
    get: jest.fn().mockResolvedValue(null),
    set: jest.fn().mockResolvedValue(undefined)
  }))
}))

jest.mock('@thedaviddias/rate-limiting', () => ({
  createRateLimiter: jest.fn(() => ({
    limit: jest.fn().mockResolvedValue({
      success: true,
      limit: 20,
      remaining: 19,
      reset: 123
    })
  })),
  slidingWindow: jest.fn()
}))

const mockExistsSync = fs.existsSync as jest.MockedFunction<typeof fs.existsSync>
const mockSentryCaptureException = Sentry.captureException as jest.MockedFunction<
  typeof Sentry.captureException
>
const mockSentryCaptureMessage = Sentry.captureMessage as jest.MockedFunction<
  typeof Sentry.captureMessage
>

describe('website file route', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    mockExistsSync.mockReturnValue(false)
  })

  it('returns 404 for invalid file names without creating a Sentry issue', async () => {
    const response = await GET(new Request('https://example.com/websites/site/robots.txt'), {
      params: Promise.resolve({ slug: 'site', file: 'robots.txt' })
    })

    expect(response.status).toBe(404)
    expect(await response.text()).toBe('Not Found')
    expect(mockSentryCaptureMessage).not.toHaveBeenCalled()
    expect(mockSentryCaptureException).not.toHaveBeenCalled()
  })

  it('returns 404 for missing website content without creating a Sentry issue', async () => {
    const response = await GET(new Request('https://example.com/websites/missing/llms.txt'), {
      params: Promise.resolve({ slug: 'missing', file: 'llms.txt' })
    })

    expect(response.status).toBe(404)
    expect(await response.text()).toBe('Not Found')
    expect(mockSentryCaptureMessage).not.toHaveBeenCalled()
    expect(mockSentryCaptureException).not.toHaveBeenCalled()
  })
})
