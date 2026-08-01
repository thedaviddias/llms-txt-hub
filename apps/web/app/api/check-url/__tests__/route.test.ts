import { createNetworkInspector } from '@thedaviddias/submission-trust/network-inspector'
import type { ResourceInspectionResult } from '@thedaviddias/submission-trust/types'
import { checkWebRiskUrl } from '@thedaviddias/submission-trust/web-risk'
import { NextRequest } from 'next/server'

const mockInspect = jest.fn<Promise<ResourceInspectionResult>, [string, { maxBytes: number }]>()

jest.mock('@thedaviddias/submission-trust/network-inspector', () => ({
  createNetworkInspector: jest.fn()
}))
jest.mock('@thedaviddias/submission-trust/web-risk', () => ({
  checkWebRiskUrl: jest.fn()
}))
jest.mock('@thedaviddias/logging', () => ({
  logger: { error: jest.fn() }
}))

import { POST } from '@/app/api/check-url/route'

const mockCreateNetworkInspector = jest.mocked(createNetworkInspector)
const mockCheckWebRiskUrl = jest.mocked(checkWebRiskUrl)

const safeReputation = { checkedAt: '2026-08-01T12:00:00.000Z', status: 'safe' } as const

const inspected = (statusCode = 200): ResourceInspectionResult => ({
  ok: true,
  resource: {
    body: '<html>Accessible</html>',
    byteCount: 23,
    contentType: 'text/html',
    finalUrl: 'https://example.com/',
    redirectUrls: [],
    reputation: safeReputation,
    reputationChecks: [{ reputation: safeReputation, url: 'https://example.com/' }],
    requestedUrl: 'https://example.com/',
    statusCode
  }
})

const failed = (
  kind:
    | 'dns_rejected'
    | 'reputation_match'
    | 'reputation_unknown'
    | 'timeout'
    | 'transport_failure',
  reasonCode:
    | 'unsafe_network_target'
    | 'reputation_match'
    | 'reputation_unknown'
    | 'required_resource_transient_failure',
  safeMessage: string
): ResourceInspectionResult => ({
  failure: { evidence: {}, kind, safeMessage },
  ok: false,
  reasonCode
})

let requestSequence = 0
const request = (body: string | Record<string, unknown>): NextRequest => {
  requestSequence += 1
  return new NextRequest('http://localhost/api/check-url', {
    body: typeof body === 'string' ? body : JSON.stringify(body),
    headers: {
      'content-type': 'application/json',
      'x-forwarded-for': `203.0.113.${requestSequence}`
    },
    method: 'POST'
  })
}

describe('/api/check-url hardened inspector route', () => {
  const originalFetch = global.fetch

  beforeEach(() => {
    jest.clearAllMocks()
    global.fetch = jest.fn(async () => {
      throw new Error('The route must not fetch user URLs directly')
    })
    mockCreateNetworkInspector.mockReturnValue({ inspect: mockInspect })
    mockInspect.mockResolvedValue(inspected())
  })

  afterAll(() => {
    global.fetch = originalFetch
  })

  it('reports accessible only for an inspector success with a 2xx status', async () => {
    const response = await POST(request({ url: 'https://example.com' }))

    await expect(response.json()).resolves.toMatchObject({
      accessible: true,
      error: null,
      status: 200,
      statusText: 'OK'
    })
    expect(mockInspect).toHaveBeenCalledWith('https://example.com/', { maxBytes: 524_288 })
    expect(global.fetch).not.toHaveBeenCalled()
  })

  it.each([199, 300, 404, 503])(
    'never reports accessible for inspector HTTP status %s',
    async statusCode => {
      mockInspect.mockResolvedValueOnce(inspected(statusCode))
      const response = await POST(request({ url: 'https://example.com' }))
      const data = await response.json()

      expect(data).toMatchObject({ accessible: false, status: statusCode })
      expect(data.error).toBe(`The site returned HTTP ${statusCode}.`)
    }
  )

  it('returns the bounded DNS rejection message', async () => {
    mockInspect.mockResolvedValueOnce(
      failed(
        'dns_rejected',
        'unsafe_network_target',
        'The resource host could not be safely inspected.'
      )
    )
    const response = await POST(request({ url: 'https://example.com' }))

    await expect(response.json()).resolves.toEqual({
      accessible: false,
      error: 'The resource host could not be safely inspected.'
    })
  })

  it('returns a safe reputation-match message without threat internals', async () => {
    mockInspect.mockResolvedValueOnce(
      failed('reputation_match', 'reputation_match', 'The resource was reported as unsafe.')
    )
    const response = await POST(request({ url: 'https://example.com' }))
    const data = await response.json()

    expect(data).toEqual({ accessible: false, error: 'The resource was reported as unsafe.' })
    expect(JSON.stringify(data)).not.toMatch(/MALWARE|api.?key|provider/i)
  })

  it.each([
    ['unknown reputation', 'reputation_unknown', 'reputation_unknown'],
    ['timeout', 'timeout', 'required_resource_transient_failure'],
    ['transport failure', 'transport_failure', 'required_resource_transient_failure']
  ] as const)('returns the safe unavailable message for %s', async (_case, kind, reasonCode) => {
    mockInspect.mockResolvedValueOnce(failed(kind, reasonCode, 'private should not escape'))
    const response = await POST(request({ url: 'https://example.com' }))

    await expect(response.json()).resolves.toEqual({
      accessible: false,
      error:
        'We could not safely verify this site right now. Nothing was published. Please try again later.'
    })
  })

  it('wires the server Web Risk key into the inspector reputation dependency', async () => {
    await POST(request({ url: 'https://example.com' }))
    const dependencies = mockCreateNetworkInspector.mock.calls[0]?.[0]
    expect(dependencies?.checkReputation).toBeDefined()

    await dependencies?.checkReputation?.('https://example.com/')

    expect(mockCheckWebRiskUrl).toHaveBeenCalledWith('https://example.com/', {
      apiKey: process.env.GOOGLE_WEB_RISK_API_KEY
    })
    expect(global.fetch).not.toHaveBeenCalled()
  })

  it('returns a safe client error for malformed JSON', async () => {
    const response = await POST(request('not-json'))
    await expect(response.json()).resolves.toEqual({
      accessible: false,
      error: 'Invalid request body.'
    })
    expect(response.status).toBe(400)
    expect(mockInspect).not.toHaveBeenCalled()
  })

  it('returns 400 when the URL is missing', async () => {
    const response = await POST(request({}))
    await expect(response.json()).resolves.toEqual({ accessible: false, error: 'URL is required' })
    expect(response.status).toBe(400)
  })

  it('rejects invalid URLs before inspection', async () => {
    const response = await POST(request({ url: 'http://localhost:3000' }))
    expect(response.status).toBe(400)
    expect(mockInspect).not.toHaveBeenCalled()
  })

  it('enforces per-IP rate limiting', async () => {
    const ip = '203.0.113.250'
    const makeRequest = (): NextRequest =>
      new NextRequest('http://localhost/api/check-url', {
        body: JSON.stringify({ url: 'https://example.com' }),
        headers: { 'content-type': 'application/json', 'x-forwarded-for': ip },
        method: 'POST'
      })

    for (let index = 0; index < 10; index += 1) {
      expect((await POST(makeRequest())).status).toBe(200)
    }
    const response = await POST(makeRequest())
    expect(response.status).toBe(429)
    expect(response.headers.get('X-RateLimit-Remaining')).toBe('0')
  })
})
