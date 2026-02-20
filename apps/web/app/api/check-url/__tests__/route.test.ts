import { POST } from '@/app/api/check-url/route'

jest.mock('@thedaviddias/logging', () => ({
  logger: {
    error: jest.fn()
  }
}))

describe('/api/check-url route hardening', () => {
  const originalFetch = global.fetch

  beforeEach(() => {
    jest.clearAllMocks()
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      status: 200,
      statusText: 'OK'
    } as Response)
  })

  afterEach(() => {
    jest.useRealTimers()
    jest.restoreAllMocks()
  })

  afterAll(() => {
    global.fetch = originalFetch
  })

  it('blocks localhost targets', async () => {
    const request = new Request('http://localhost/api/check-url', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-forwarded-for': '203.0.113.10'
      },
      body: JSON.stringify({ url: 'http://localhost:3000' })
    })

    const response = await POST(request as any)
    const data = await response.json()

    expect(response.status).toBe(400)
    expect(data.error).toBe('URL points to a restricted network address')
    expect(global.fetch).not.toHaveBeenCalled()
  })

  it('blocks private IPv4 targets', async () => {
    const request = new Request('http://localhost/api/check-url', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-forwarded-for': '203.0.113.11'
      },
      body: JSON.stringify({ url: 'http://192.168.1.12' })
    })

    const response = await POST(request as any)
    const data = await response.json()

    expect(response.status).toBe(400)
    expect(data.error).toBe('URL points to a restricted network address')
    expect(global.fetch).not.toHaveBeenCalled()
  })

  it('allows public https targets and performs HEAD request', async () => {
    const request = new Request('http://localhost/api/check-url', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-forwarded-for': '203.0.113.12'
      },
      body: JSON.stringify({ url: 'https://example.com' })
    })

    const response = await POST(request as any)
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data.accessible).toBe(true)
    expect(global.fetch).toHaveBeenCalledWith(
      'https://example.com/',
      expect.objectContaining({
        method: 'HEAD',
        redirect: 'manual'
      })
    )
  })

  it('returns 400 when url field is missing', async () => {
    const request = new Request('http://localhost/api/check-url', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-forwarded-for': '203.0.113.13'
      },
      body: JSON.stringify({})
    })

    const response = await POST(request as any)
    const data = await response.json()

    expect(response.status).toBe(400)
    expect(data.error).toBe('URL is required')
    expect(global.fetch).not.toHaveBeenCalled()
  })

  it('enforces per-IP rate limiting', async () => {
    const ip = '203.0.113.14'
    const makeRequest = () =>
      POST(
        new Request('http://localhost/api/check-url', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-forwarded-for': ip
          },
          body: JSON.stringify({ url: 'https://example.com' })
        }) as any
      )

    for (let i = 0; i < 10; i++) {
      const response = await makeRequest()
      expect(response.status).toBe(200)
    }

    const limited = await makeRequest()
    const data = await limited.json()

    expect(limited.status).toBe(429)
    expect(data.error).toBe('Rate limit exceeded. Please try again later.')
    expect(limited.headers.get('X-RateLimit-Remaining')).toBe('0')
  })

  it('maps abort errors to timeout message', async () => {
    const abortError = new Error('The operation was aborted')
    abortError.name = 'AbortError'
    global.fetch = jest.fn().mockRejectedValueOnce(abortError)

    const request = new Request('http://localhost/api/check-url', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-forwarded-for': '203.0.113.15'
      },
      body: JSON.stringify({ url: 'https://example.com' })
    })

    const response = await POST(request as any)
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data.accessible).toBe(false)
    expect(data.error).toBe('Request timed out')
  })

  it('maps fetch transport errors to a safe network error message', async () => {
    global.fetch = jest.fn().mockRejectedValueOnce(new Error('fetch failed'))

    const request = new Request('http://localhost/api/check-url', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-forwarded-for': '203.0.113.16'
      },
      body: JSON.stringify({ url: 'https://example.com' })
    })

    const response = await POST(request as any)
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data.error).toBe('Network error or URL unreachable')
  })

  it('returns 500 for malformed JSON body', async () => {
    const request = new Request('http://localhost/api/check-url', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-forwarded-for': '203.0.113.17'
      },
      body: 'not-json'
    })

    const response = await POST(request as any)
    const data = await response.json()

    expect(response.status).toBe(500)
    expect(data.error).toBe('Internal server error')
  })

  it('aborts long-running fetch requests via timeout', async () => {
    jest.useFakeTimers()

    global.fetch = jest.fn((_input: RequestInfo | URL, init?: RequestInit) => {
      return new Promise((_resolve, reject) => {
        const signal = init?.signal
        if (signal) {
          signal.addEventListener('abort', () => {
            const abortError = new Error('The operation was aborted')
            abortError.name = 'AbortError'
            reject(abortError)
          })
        }
      }) as Promise<Response>
    })

    const request = new Request('http://localhost/api/check-url', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-forwarded-for': '203.0.113.18'
      },
      body: JSON.stringify({ url: 'https://example.com' })
    })

    const responsePromise = POST(request as any)
    await jest.advanceTimersByTimeAsync(5500)
    const response = await responsePromise
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data.error).toBe('Request timed out')
  })

  it('cleans up expired rate-limit entries when map grows large', async () => {
    const nowSpy = jest.spyOn(Date, 'now')
    const baseNow = 1000
    nowSpy.mockReturnValue(baseNow)

    for (let i = 0; i < 1001; i++) {
      const response = await POST(
        new Request('http://localhost/api/check-url', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-forwarded-for': `198.51.100.${i % 255}-${i}`
          },
          body: JSON.stringify({})
        }) as any
      )
      expect(response.status).toBe(400)
    }

    nowSpy.mockReturnValue(baseNow + 61_000)

    const response = await POST(
      new Request('http://localhost/api/check-url', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-forwarded-for': '198.51.100.cleanup'
        },
        body: JSON.stringify({})
      }) as any
    )
    const data = await response.json()

    expect(response.status).toBe(400)
    expect(data.error).toBe('URL is required')
  })
})
