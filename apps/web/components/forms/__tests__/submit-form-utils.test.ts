import { NextRequest } from 'next/server'
import { validateCSRFToken } from '@/lib/middleware-csrf'
import {
  checkUrl,
  generateLlmsFullUrl,
  generateLlmsUrl,
  isSameDomain,
  normalizeDomain
} from '../submit-form-utils'

const mockFetch = jest.fn<ReturnType<typeof fetch>, Parameters<typeof fetch>>()
const originalFetch = global.fetch
const csrfToken = 'url-check-csrf-token'
const origin = 'https://llmstxthub.com'

describe('checkUrl', () => {
  beforeEach(() => {
    mockFetch.mockReset()
    global.fetch = mockFetch
    const meta = document.createElement('meta')
    meta.name = 'csrf-token'
    meta.content = csrfToken
    document.head.appendChild(meta)
  })

  afterEach(() => {
    document.querySelectorAll('meta[name="csrf-token"]').forEach(meta => meta.remove())
    global.fetch = originalFetch
  })

  it('sends a URL check that passes the real middleware CSRF validator', async () => {
    const controller = new AbortController()
    mockFetch.mockImplementation(async (_input, options) => {
      const headers = new Headers(options?.headers)
      headers.set('host', 'llmstxthub.com')
      headers.set('origin', origin)
      headers.set(
        'cookie',
        `csrf_token=${encodeURIComponent(JSON.stringify({ token: csrfToken, expiresAt: Date.now() + 60_000 }))}`
      )
      const request = new NextRequest(`${origin}/api/check-url`, {
        ...options,
        headers,
        signal: options?.signal ?? undefined
      })
      // The shared Jest NextRequest stub does not implement its cookie accessor.
      Object.defineProperty(request, 'cookies', {
        value: {
          get: (name: string) =>
            name === 'csrf_token'
              ? { value: JSON.stringify({ token: csrfToken, expiresAt: Date.now() + 60_000 }) }
              : undefined
        }
      })
      const valid = await validateCSRFToken(request)
      return new Response(
        JSON.stringify(valid ? { accessible: true } : { error: 'Invalid or missing CSRF token' }),
        { status: valid ? 200 : 403 }
      )
    })

    const result = await checkUrl('https://example.com/llms.txt', controller.signal)
    await mockFetch.mock.results[0]?.value
    expect(result).toEqual({
      checking: false,
      accessible: true,
      error: undefined
    })
    expect(mockFetch).toHaveBeenCalledWith('/api/check-url', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-csrf-token': csrfToken },
      body: JSON.stringify({ url: 'https://example.com/llms.txt' }),
      signal: controller.signal
    })
  })

  it('does not fetch for an empty URL', async () => {
    await expect(checkUrl('')).resolves.toEqual({ checking: false, accessible: null })
    expect(mockFetch).not.toHaveBeenCalled()
  })

  it.each([
    [403, 'Invalid or missing CSRF token'],
    [429, 'Too many requests. Please try again later.'],
    [500, 'The URL check is temporarily unavailable.']
  ])('reports HTTP %s as inaccessible with the server message', async (status, error) => {
    mockFetch.mockResolvedValue(new Response(JSON.stringify({ error }), { status }))

    await expect(checkUrl('https://example.com/llms.txt')).resolves.toEqual({
      checking: false,
      accessible: false,
      error
    })
  })

  it.each([403, 429, 500])('never accepts accessible:true on HTTP %s', async status => {
    mockFetch.mockResolvedValue(new Response(JSON.stringify({ accessible: true }), { status }))

    await expect(checkUrl('https://example.com/llms.txt')).resolves.toEqual({
      checking: false,
      accessible: false,
      error: expect.stringMatching(/try again|refresh/i)
    })
  })

  it.each(['not json', 'null', '[]', '{}', '{"accessible":"true"}', '{"accessible":1}'])(
    'fails closed for malformed URL-check payload %s',
    async payload => {
      mockFetch.mockResolvedValue(new Response(payload, { status: 200 }))

      await expect(checkUrl('https://example.com/llms.txt')).resolves.toEqual({
        checking: false,
        accessible: false,
        error: expect.stringMatching(/try again/i)
      })
    }
  )

  it.each([{ stack: 'Internal stack trace' }, 42, '   '])(
    'uses a helpful fallback when an error message is invalid: %j',
    async error => {
      mockFetch.mockResolvedValue(
        new Response(JSON.stringify({ accessible: false, error }), { status: 200 })
      )

      await expect(checkUrl('https://example.com/llms.txt')).resolves.toEqual({
        checking: false,
        accessible: false,
        error: expect.stringMatching(/try again/i)
      })
    }
  )

  it('preserves a safe inaccessible result from the endpoint', async () => {
    const result = { accessible: false, error: 'The URL returned HTTP 404.' }
    mockFetch.mockResolvedValue(new Response(JSON.stringify(result), { status: 200 }))

    await expect(checkUrl('https://example.com/llms.txt')).resolves.toEqual({
      checking: false,
      ...result
    })
  })

  it('uses a safe fallback after a network failure', async () => {
    mockFetch.mockRejectedValue(new Error('Internal stack trace and transport details'))

    await expect(checkUrl('https://example.com/llms.txt')).resolves.toEqual({
      checking: false,
      accessible: false,
      error: expect.stringMatching(/try again/i)
    })
  })
})

describe('submission URL domains', () => {
  it.each([
    ['https://example.com', 'https://docs.example.com/llms.txt'],
    ['https://www.example.co.uk', 'https://docs.example.co.uk/llms.txt'],
    ['https://foo.github.io', 'https://docs.foo.github.io/llms.txt']
  ])('accepts the same site family for %s and %s', (website, llmsUrl) => {
    expect(isSameDomain(website, llmsUrl)).toBe(true)
  })

  it.each([
    ['https://example.com', 'https://unrelated.com/llms.txt'],
    ['https://foo.github.io', 'https://bar.github.io/llms.txt'],
    ['https://example.co.uk', 'https://unrelated.co.uk/llms.txt'],
    ['not a URL', 'https://example.com/llms.txt'],
    ['https://example.com', 'not a URL'],
    ['', '']
  ])('rejects unrelated or malformed URLs %s and %s', (website, llmsUrl) => {
    expect(isSameDomain(website, llmsUrl)).toBe(false)
  })

  it('keeps hostname display and generated URLs independent of site-family matching', () => {
    expect(normalizeDomain(' https://www.docs.example.com/path ')).toBe('docs.example.com')
    expect(generateLlmsUrl('https://docs.example.com/path')).toBe(
      'https://docs.example.com/llms.txt'
    )
    expect(generateLlmsFullUrl('https://docs.example.com/path')).toBe(
      'https://docs.example.com/llms-full.txt'
    )
  })
})
