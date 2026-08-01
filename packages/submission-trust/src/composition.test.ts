import { describe, expect, it, vi } from 'vitest'

import { assessPublicationFields } from './assessment.js'
import { createNetworkInspector } from './network-inspector.js'
import type { PinnedTransportResponse, SubmissionFields } from './types.js'
import { checkWebRiskUrl } from './web-risk.js'

const NOW = new Date('2026-08-01T12:00:00.000Z')
const FIELDS: SubmissionFields = {
  category: 'developer-tools',
  description: 'Useful example documentation.',
  llmsUrl: 'https://example.com/llms.txt',
  name: 'Example',
  publishedAt: '2026-08-01',
  website: 'https://example.com'
}
const LLMS_BODY = `# Example\n\n${'A useful documentation index. '.repeat(4)}https://example.com/docs`
const HOMEPAGE_BODY = `<html><body>${'Meaningful homepage content. '.repeat(4)}</body></html>`

const response = (body: string, contentType: string): PinnedTransportResponse => ({
  body: {
    async *[Symbol.asyncIterator]() {
      yield Buffer.from(body)
    }
  },
  headers: { 'content-type': contentType },
  statusCode: 200
})

describe('submission trust composition', () => {
  it('composes assessment, pinned inspection, and Web Risk with only external seams mocked', async () => {
    const provider = vi.fn<typeof fetch>(
      async () =>
        new Response('{}', { headers: { 'content-type': 'application/json' }, status: 200 })
    )
    const transport = vi.fn(async request =>
      request.url.endsWith('/llms.txt')
        ? response(LLMS_BODY, 'text/plain; charset=utf-8')
        : response(HOMEPAGE_BODY, 'text/html; charset=utf-8')
    )
    const inspector = createNetworkInspector({
      checkReputation: url =>
        checkWebRiskUrl(url, { apiKey: 'server-only-key', fetch: provider, now: () => NOW }),
      now: () => NOW,
      resolve: vi.fn(async () => [{ address: '93.184.216.34', family: 4 }]),
      transport
    })

    const result = await assessPublicationFields(FIELDS, {
      inspectResource: inspector.inspect,
      now: () => NOW
    })

    expect(result).toMatchObject({ decision: 'auto_publish', reasonCode: 'passed' })
    expect(provider).toHaveBeenCalledTimes(2)
    expect(transport).toHaveBeenCalledTimes(2)
  })

  it('fails closed through the real layers when the server Web Risk key is missing', async () => {
    const provider = vi.fn<typeof fetch>()
    const transport = vi.fn(async () => response(LLMS_BODY, 'text/plain'))
    const inspector = createNetworkInspector({
      checkReputation: url =>
        checkWebRiskUrl(url, { apiKey: undefined, fetch: provider, now: () => NOW }),
      now: () => NOW,
      resolve: vi.fn(async () => [{ address: '93.184.216.34', family: 4 }]),
      transport
    })

    const result = await assessPublicationFields(FIELDS, {
      inspectResource: inspector.inspect,
      now: () => NOW
    })

    expect(result).toMatchObject({ decision: 'retry_later', reasonCode: 'reputation_unknown' })
    expect(provider).not.toHaveBeenCalled()
    expect(transport).not.toHaveBeenCalled()
  })
})
