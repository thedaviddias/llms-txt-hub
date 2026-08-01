import { describe, expect, it, vi } from 'vitest'
import {
  createNetworkInspector,
  type NetworkInspectorDependencies,
  type PinnedTransportRequest,
  type PinnedTransportResponse
} from './network-inspector.js'
import type { ReputationResult } from './types.js'

const SAFE_REPUTATION: ReputationResult = {
  checkedAt: '2026-08-01T12:00:00.000Z',
  status: 'safe'
}

const chunks = (...values: string[]): AsyncIterable<Uint8Array> => ({
  async *[Symbol.asyncIterator]() {
    for (const value of values) {
      yield Buffer.from(value)
    }
  }
})

const response = (
  statusCode = 200,
  headers: Readonly<Record<string, string | undefined>> = {},
  body: AsyncIterable<Uint8Array> = chunks('hello')
): PinnedTransportResponse => ({ body, headers, statusCode })

const dependencies = (
  overrides: Partial<NetworkInspectorDependencies> = {}
): NetworkInspectorDependencies => ({
  checkReputation: vi.fn(async () => SAFE_REPUTATION),
  now: () => new Date('2026-08-01T12:00:00.000Z'),
  resolve: vi.fn(async () => [{ address: '93.184.216.34', family: 4 }]),
  runWithTimeout: vi.fn(async operation => operation()),
  transport: vi.fn(async () => response()),
  ...overrides
})

describe('createNetworkInspector', () => {
  it('rejects a hostname when any DNS answer is non-public', async () => {
    const transport = vi.fn(async () => response())
    const inspector = createNetworkInspector(
      dependencies({
        resolve: vi.fn(async () => [
          { address: '93.184.216.34', family: 4 },
          { address: '10.0.0.1', family: 4 }
        ]),
        transport
      })
    )

    const result = await inspector.inspect('https://example.com', { maxBytes: 100 })

    expect(result).toMatchObject({
      failure: { kind: 'dns_rejected' },
      ok: false,
      reasonCode: 'unsafe_network_target'
    })
    expect(transport).not.toHaveBeenCalled()
  })

  it('checks reputation before transport on every hop and pins one validated address', async () => {
    const events: string[] = []
    const requests: PinnedTransportRequest[] = []
    const resolve = vi.fn(async (hostname: string) => {
      events.push(`resolve:${hostname}`)
      return hostname === 'example.com'
        ? [
            { address: '93.184.216.34', family: 4 },
            { address: '2606:2800:220:1:248:1893:25c8:1946', family: 6 }
          ]
        : [{ address: '1.1.1.1', family: 4 }]
    })
    const checkReputation = vi.fn(async (url: string) => {
      events.push(`reputation:${url}`)
      return SAFE_REPUTATION
    })
    const transport = vi.fn(async (request: PinnedTransportRequest) => {
      requests.push(request)
      events.push(`transport:${request.url}`)
      return requests.length === 1
        ? response(302, { location: 'https://cdn.example.com:443/final#fragment' }, chunks())
        : response(200, { 'content-type': 'text/plain' }, chunks('safe body'))
    })
    const inspector = createNetworkInspector(dependencies({ checkReputation, resolve, transport }))

    const result = await inspector.inspect('https://example.com/start', { maxBytes: 100 })

    expect(events).toEqual([
      'resolve:example.com',
      'reputation:https://example.com/start',
      'transport:https://example.com/start',
      'resolve:cdn.example.com',
      'reputation:https://cdn.example.com/final',
      'transport:https://cdn.example.com/final'
    ])
    expect(requests[0]).toMatchObject({
      address: '93.184.216.34',
      family: 4,
      hostname: 'example.com',
      servername: 'example.com'
    })
    expect(requests[0]?.headers).toEqual({
      'accept-encoding': 'identity',
      'user-agent': 'llms-txt-hub-submission-inspector/1.0'
    })
    expect(result).toEqual({
      ok: true,
      resource: {
        body: 'safe body',
        byteCount: 9,
        contentType: 'text/plain',
        finalUrl: 'https://cdn.example.com/final',
        redirectUrls: ['https://cdn.example.com/final'],
        reputation: SAFE_REPUTATION,
        requestedUrl: 'https://example.com/start',
        statusCode: 200
      }
    })
  })

  it.each([
    ['http://example.com', 'redirect_policy_failure'],
    ['https://user:secret@example.com', 'redirect_policy_failure'],
    ['https://example.com:444', 'redirect_policy_failure']
  ])('fails closed before transport for %s', async (url, kind) => {
    const transport = vi.fn(async () => response())
    const inspector = createNetworkInspector(dependencies({ transport }))

    const result = await inspector.inspect(url, { maxBytes: 100 })

    expect(result).toMatchObject({ failure: { kind }, ok: false })
    expect(transport).not.toHaveBeenCalled()
  })

  it('rejects an HTTPS-to-HTTP redirect before resolving or checking its destination', async () => {
    const resolve = vi.fn(async () => [{ address: '93.184.216.34', family: 4 }])
    const checkReputation = vi.fn(async () => SAFE_REPUTATION)
    const inspector = createNetworkInspector(
      dependencies({
        checkReputation,
        resolve,
        transport: vi.fn(async () =>
          response(302, { location: 'http://example.com/downgraded' }, chunks())
        )
      })
    )

    const result = await inspector.inspect('https://example.com/start', { maxBytes: 100 })

    expect(result).toMatchObject({
      failure: { kind: 'redirect_policy_failure' },
      ok: false
    })
    expect(resolve).toHaveBeenCalledTimes(1)
    expect(checkReputation).toHaveBeenCalledTimes(1)
  })

  it('rejects a fourth redirect', async () => {
    let count = 0
    const inspector = createNetworkInspector(
      dependencies({
        transport: vi.fn(async () => {
          count += 1
          return response(302, { location: `https://example.com/hop-${count}` }, chunks())
        })
      })
    )

    const result = await inspector.inspect('https://example.com/start', { maxBytes: 100 })

    expect(result).toMatchObject({
      failure: { kind: 'redirect_policy_failure' },
      ok: false
    })
    expect(count).toBe(4)
  })

  it('fails safely for redirect loops and invalid locations', async () => {
    for (const location of ['https://example.com/start', 'http://[invalid']) {
      const inspector = createNetworkInspector(
        dependencies({
          transport: vi.fn(async () => response(302, { location }, chunks()))
        })
      )

      const result = await inspector.inspect('https://example.com/start', { maxBytes: 100 })
      expect(result).toMatchObject({
        failure: { kind: 'redirect_policy_failure' },
        ok: false
      })
    }
  })

  it('maps unsafe and unknown reputation results without retrieving a response', async () => {
    const cases: readonly [ReputationResult, string, string][] = [
      [
        {
          checkedAt: '2026-08-01T12:00:00.000Z',
          status: 'unsafe',
          threatTypes: ['MALWARE']
        },
        'reputation_match',
        'reputation_match'
      ],
      [
        {
          checkedAt: '2026-08-01T12:00:00.000Z',
          reason: 'provider unavailable with sensitive detail',
          status: 'unknown'
        },
        'reputation_unknown',
        'reputation_unknown'
      ]
    ]

    for (const [reputation, kind, reasonCode] of cases) {
      const transport = vi.fn(async () => response())
      const inspector = createNetworkInspector(
        dependencies({ checkReputation: vi.fn(async () => reputation), transport })
      )
      const result = await inspector.inspect('https://example.com', { maxBytes: 100 })

      expect(result).toMatchObject({ failure: { kind }, ok: false, reasonCode })
      expect(JSON.stringify(result)).not.toContain('sensitive detail')
      expect(transport).not.toHaveBeenCalled()
    }
  })

  it('fails closed on timeout without exposing the raw error', async () => {
    const runWithTimeout = vi.fn(async () => {
      throw new Error('token=super-secret ETIMEDOUT upstream bytes')
    })
    const inspector = createNetworkInspector(dependencies({ runWithTimeout }))

    const result = await inspector.inspect('https://example.com', { maxBytes: 100 })

    expect(result).toMatchObject({ failure: { kind: 'timeout' }, ok: false })
    expect(JSON.stringify(result)).not.toContain('super-secret')
  })

  it('turns raw transport failures into a bounded safe result', async () => {
    const inspector = createNetworkInspector(
      dependencies({
        transport: vi.fn(async () => {
          throw new Error('authorization=secret response-body=private')
        })
      })
    )

    const result = await inspector.inspect('https://example.com', { maxBytes: 100 })

    expect(result).toMatchObject({
      failure: {
        evidence: {},
        kind: 'transport_failure',
        safeMessage: 'The resource could not be inspected.'
      },
      ok: false
    })
    expect(JSON.stringify(result)).not.toContain('secret')
    expect(JSON.stringify(result)).not.toContain('private')
  })

  it('enforces byte limits while streaming and stops reading immediately', async () => {
    let yielded = 0
    const body: AsyncIterable<Uint8Array> = {
      async *[Symbol.asyncIterator]() {
        for (const value of ['1234', '5678', 'must-not-be-read']) {
          yielded += 1
          yield Buffer.from(value)
        }
      }
    }
    const inspector = createNetworkInspector(
      dependencies({ transport: vi.fn(async () => response(200, {}, body)) })
    )

    const result = await inspector.inspect('https://example.com', { maxBytes: 5 })

    expect(result).toMatchObject({ failure: { kind: 'oversized_content' }, ok: false })
    expect(yielded).toBe(2)
    expect(JSON.stringify(result)).not.toContain('12345678')
  })

  it.each(['gzip', 'br', 'gzip, identity'])('rejects content encoding %s', async encoding => {
    const inspector = createNetworkInspector(
      dependencies({
        transport: vi.fn(async () => response(200, { 'content-encoding': encoding }))
      })
    )

    const result = await inspector.inspect('https://example.com', { maxBytes: 100 })

    expect(result).toMatchObject({ failure: { kind: 'transport_failure' }, ok: false })
  })

  it('does not forward caller credentials, secrets, or internal headers', async () => {
    const transport = vi.fn(async (_request: PinnedTransportRequest) => response())
    const inspector = createNetworkInspector(dependencies({ transport }))

    await inspector.inspect('https://example.com', { maxBytes: 100 })

    const request = transport.mock.calls[0]?.[0]
    expect(request?.headers).not.toHaveProperty('cookie')
    expect(request?.headers).not.toHaveProperty('authorization')
    expect(request?.headers).not.toHaveProperty('referer')
    expect(request?.headers).not.toHaveProperty('x-forwarded-for')
    expect(request?.headers).not.toHaveProperty('x-internal-token')
  })
})
