import { logger } from '@thedaviddias/logging'
import { assessPublicationFields } from '@thedaviddias/submission-trust/assessment'
import { assessSubmission } from './submission-assessment'

jest.mock('@thedaviddias/logging', () => ({ logger: { warn: jest.fn() } }))
jest.mock('@thedaviddias/submission-trust/assessment', () => ({
  assessPublicationFields: jest.fn()
}))
jest.mock('@thedaviddias/submission-trust/network-inspector', () => ({
  createNetworkInspector: () => ({ inspect: jest.fn() })
}))

it('logs bounded resource diagnostics without submitted URLs or content', async () => {
  jest.mocked(assessPublicationFields).mockResolvedValue({
    decision: 'reject',
    reasonCode: 'required_resource_missing',
    publicMessage: 'Invalid resource',
    checkedAt: '2026-09-08T00:00:00.000Z',
    policyVersion: 'test',
    evidence: [
      {
        check: 'resource',
        resource: 'llms',
        decision: 'reject',
        reasonCode: 'required_resource_missing',
        details: {
          statusCode: 403,
          contentType: 'text/html',
          byteCount: 120,
          finalHost: 'private.example.com'
        }
      }
    ]
  })
  await assessSubmission({
    website: 'https://private.example.com/secret',
    llmsUrl: 'https://private.example.com/llms.txt?secret=1',
    name: 'Private name',
    description: 'Private description',
    publishedAt: '2026-09-08',
    category: 'developer-tools'
  })
  expect(logger.warn).toHaveBeenCalledWith(
    'Submission resource assessment failed',
    expect.objectContaining({
      data: expect.objectContaining({
        resources: [
          expect.objectContaining({
            resource: 'llms',
            statusCode: 403,
            contentType: 'text/html',
            byteCount: 120
          })
        ]
      })
    })
  )
  expect(JSON.stringify(jest.mocked(logger.warn).mock.calls)).not.toMatch(/private|secret/i)
})
