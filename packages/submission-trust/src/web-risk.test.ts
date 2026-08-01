import { afterEach, describe, expect, it, vi } from 'vitest'

import { checkWebRiskUrl, WEB_RISK_THREAT_TYPES } from './web-risk.js'

const NOW = new Date('2026-08-01T12:00:00.000Z')
const API_KEY = 'server-only-api-key'
type FetchTransport = typeof fetch

const response = (body: string, status = 200): Response =>
  new Response(body, { headers: { 'content-type': 'application/json' }, status })

describe('checkWebRiskUrl', () => {
  afterEach(() => {
    vi.useRealTimers()
  })

  it('sends one fixed-endpoint GET with the URI, key, and every threat type', async () => {
    const transport = vi.fn<FetchTransport>(async () => response('{}'))

    const result = await checkWebRiskUrl('https://example.com/a?x=1&y=2', {
      apiKey: API_KEY,
      fetch: transport,
      now: () => NOW
    })

    expect(transport).toHaveBeenCalledTimes(1)
    const [input, init] = transport.mock.calls[0] ?? []
    const requestUrl = new URL(String(input))
    expect(`${requestUrl.origin}${requestUrl.pathname}`).toBe(
      'https://webrisk.googleapis.com/v1/uris:search'
    )
    expect(requestUrl.searchParams.getAll('uri')).toEqual(['https://example.com/a?x=1&y=2'])
    expect(requestUrl.searchParams.getAll('threatTypes')).toEqual(WEB_RISK_THREAT_TYPES)
    expect(requestUrl.searchParams.get('key')).toBe(API_KEY)
    expect(init).toMatchObject({ method: 'GET' })
    expect(init?.signal).toBeInstanceOf(AbortSignal)
    expect(result).toEqual({
      checkedAt: NOW.toISOString(),
      expiresAt: '2026-08-01T12:10:00.000Z',
      status: 'safe'
    })
  })

  it('returns unsafe with provider threat types and a valid expiry', async () => {
    const transport = vi.fn<FetchTransport>(async () =>
      response(
        JSON.stringify({
          threat: {
            expireTime: '2026-08-01T12:05:00.000Z',
            threatTypes: ['MALWARE', 'SOCIAL_ENGINEERING']
          }
        })
      )
    )

    await expect(
      checkWebRiskUrl('https://example.com', {
        apiKey: API_KEY,
        fetch: transport,
        now: () => NOW
      })
    ).resolves.toEqual({
      checkedAt: NOW.toISOString(),
      expiresAt: '2026-08-01T12:05:00.000Z',
      status: 'unsafe',
      threatTypes: ['MALWARE', 'SOCIAL_ENGINEERING']
    })
  })

  it.each([400, 401, 403, 429, 500, 503])('maps HTTP %s to sanitized unknown', async status => {
    const transport = vi.fn<FetchTransport>(async () => response('{"secret":"raw"}', status))
    const result = await checkWebRiskUrl('https://example.com', {
      apiKey: API_KEY,
      fetch: transport,
      now: () => NOW
    })

    expect(result).toEqual({
      checkedAt: NOW.toISOString(),
      reason: 'URL reputation could not be verified.',
      status: 'unknown'
    })
    expect(JSON.stringify(result)).not.toContain(API_KEY)
    expect(JSON.stringify(result)).not.toContain('raw')
  })

  it.each([
    ['invalid JSON', response('not-json')],
    ['non-object', response('[]')],
    ['null threat', response('{"threat":null}')],
    ['missing threat types', response('{"threat":{"expireTime":"2026-08-01T12:05:00Z"}}')],
    [
      'empty threat types',
      response('{"threat":{"threatTypes":[],"expireTime":"2026-08-01T12:05:00Z"}}')
    ],
    [
      'malformed threat types',
      response('{"threat":{"threatTypes":[1],"expireTime":"2026-08-01T12:05:00Z"}}')
    ],
    ['missing expiry', response('{"threat":{"threatTypes":["MALWARE"]}}')],
    ['malformed expiry', response('{"threat":{"threatTypes":["MALWARE"],"expireTime":"later"}}')]
  ])('fails closed for %s', async (_case, providerResponse) => {
    const result = await checkWebRiskUrl('https://example.com', {
      apiKey: API_KEY,
      fetch: vi.fn<FetchTransport>(async () => providerResponse),
      now: () => NOW
    })

    expect(result.status).toBe('unknown')
  })

  it('never treats an unexpected nonempty threat match as safe', async () => {
    const result = await checkWebRiskUrl('https://example.com', {
      apiKey: API_KEY,
      fetch: vi.fn<FetchTransport>(async () =>
        response('{"threat":{"threatTypes":["FUTURE_THREAT"],"expireTime":"2026-08-01T12:05:00Z"}}')
      ),
      now: () => NOW
    })

    expect(result.status).not.toBe('safe')
  })

  it.each([undefined, '', '   '])('does not request without a usable API key', async apiKey => {
    const transport = vi.fn<FetchTransport>()
    const result = await checkWebRiskUrl('https://example.com', {
      apiKey,
      fetch: transport,
      now: () => NOW
    })

    expect(result.status).toBe('unknown')
    expect(transport).not.toHaveBeenCalled()
  })

  it('sanitizes thrown transport errors', async () => {
    const result = await checkWebRiskUrl('https://example.com', {
      apiKey: API_KEY,
      fetch: vi.fn<FetchTransport>(async () => {
        throw new Error(`provider body and key ${API_KEY}`)
      }),
      now: () => NOW
    })

    expect(result.status).toBe('unknown')
    expect(JSON.stringify(result)).not.toContain('provider body')
    expect(JSON.stringify(result)).not.toContain(API_KEY)
  })

  it('aborts at the configured timeout and clears the timer without late rejection', async () => {
    vi.useFakeTimers()
    let capturedSignal: AbortSignal | undefined
    const transport = vi.fn<FetchTransport>(async (_input, init) => {
      capturedSignal = init?.signal ?? undefined
      return new Promise<Response>((_resolve, reject) => {
        capturedSignal?.addEventListener('abort', () => reject(new Error('late private error')))
      })
    })

    const pending = checkWebRiskUrl('https://example.com', {
      apiKey: API_KEY,
      fetch: transport,
      now: () => NOW,
      timeoutMs: 25
    })
    await vi.advanceTimersByTimeAsync(25)

    await expect(pending).resolves.toMatchObject({ status: 'unknown' })
    expect(capturedSignal?.aborted).toBe(true)
    expect(vi.getTimerCount()).toBe(0)
  })
})
