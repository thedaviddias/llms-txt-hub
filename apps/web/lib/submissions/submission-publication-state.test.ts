import { evalRedis, get } from '@/lib/redis'
import {
  recordFinalSubmissionOutcome,
  submissionPublicationState
} from './submission-publication-state'

jest.mock('@/lib/redis', () => ({ evalRedis: jest.fn(), get: jest.fn() }))

const mockEval = jest.mocked(evalRedis)
const mockGet = jest.mocked(get)
const FIELDS = {
  category: 'developer-tools',
  description: 'A useful developer platform.',
  llmsUrl: 'https://example.com/llms.txt',
  name: 'Example',
  publishedAt: '2026-08-02',
  website: 'https://example.com/'
}

describe('submission publication state', () => {
  beforeEach(() => {
    mockEval.mockResolvedValue('updated')
    mockGet.mockResolvedValue(null)
  })

  it('records an exact publication-attempt boundary before branch state mutation', async () => {
    await expect(
      submissionPublicationState.beginAttempt({
        branch: 'submit/sub_123',
        outcome: 'automatic',
        resultCode: 'auto_publish',
        submissionId: 'sub_123'
      })
    ).resolves.toBe(true)

    expect(mockEval.mock.calls[0]?.[0]).toContain('record.publicationAttempted = true')
    expect(mockEval.mock.calls[0]?.[2]).toEqual([
      'attempt',
      'submit/sub_123',
      'automatic',
      'auto_publish',
      expect.any(String)
    ])
  })

  it('records the deterministic branch before publication without storing submitted URLs', async () => {
    await expect(
      submissionPublicationState.persistBranch({
        branch: 'submit/sub_123',
        outcome: 'automatic',
        resultCode: 'auto_publish',
        submissionId: 'sub_123'
      })
    ).resolves.toBe(true)

    expect(mockEval).toHaveBeenCalledWith(
      expect.stringContaining("record.state = 'auto_publish_pending'"),
      ['submission:sub_123'],
      expect.arrayContaining(['branch', 'submit/sub_123', 'automatic'])
    )
    expect(JSON.stringify(mockEval.mock.calls[0])).not.toContain('example.com')
  })

  it('persists PR number and exact head while leaving handoff in publishing', async () => {
    await submissionPublicationState.persistGithub({
      branch: 'submit/sub_123',
      headSha: 'a'.repeat(40),
      prNumber: 42,
      submissionId: 'sub_123'
    })
    expect(mockEval.mock.calls[0]?.[2]).toEqual([
      'github',
      'submit/sub_123',
      '42',
      'a'.repeat(40),
      expect.any(String)
    ])
    expect(mockEval.mock.calls[0]?.[0]).toContain("record.state = 'publishing'")
    expect(mockEval.mock.calls[0]?.[0]).not.toContain("record.state = 'published'")
  })

  it.each([
    [
      'attempt boundary',
      () =>
        submissionPublicationState.beginAttempt({
          branch: 'submit/sub_123',
          outcome: 'automatic',
          resultCode: 'auto_publish',
          submissionId: 'sub_123'
        }),
      {
        branch: 'submit/sub_123',
        publicationAttempted: true,
        resultCode: 'auto_publish',
        state: 'final_assessing'
      }
    ],
    [
      'branch',
      () =>
        submissionPublicationState.persistBranch({
          branch: 'submit/sub_123',
          outcome: 'automatic',
          resultCode: 'auto_publish',
          submissionId: 'sub_123'
        }),
      { branch: 'submit/sub_123', resultCode: 'auto_publish', state: 'auto_publish_pending' }
    ],
    [
      'GitHub facts',
      () =>
        submissionPublicationState.persistGithub({
          branch: 'submit/sub_123',
          headSha: 'a'.repeat(40),
          prNumber: 42,
          submissionId: 'sub_123'
        }),
      {
        branch: 'submit/sub_123',
        headSha: 'a'.repeat(40),
        prNumber: 42,
        state: 'publishing'
      }
    ],
    [
      'failure',
      () =>
        submissionPublicationState.markFailed({
          branch: 'submit/sub_123',
          outcome: 'automatic',
          resultCode: 'auto_publish',
          submissionId: 'sub_123'
        }),
      {
        branch: 'submit/sub_123',
        resultCode: 'publication_unavailable',
        state: 'publish_failed'
      }
    ]
  ] as const)(
    'reconciles a committed %s mutation after its Redis response is lost',
    async (_label, operation, record) => {
      mockEval.mockResolvedValue(null)
      mockGet.mockResolvedValue({ ...record, submissionId: 'sub_123' })

      await expect(operation()).resolves.toBe(true)
      expect(mockGet).toHaveBeenCalledWith('submission:sub_123')
    }
  )

  it('does not reconcile a response loss from foreign or mismatched durable state', async () => {
    mockEval.mockResolvedValue(null)
    mockGet.mockResolvedValue({
      branch: 'submit/sub_other',
      publicationAttempted: true,
      resultCode: 'auto_publish',
      state: 'final_assessing',
      submissionId: 'sub_123'
    })

    await expect(
      submissionPublicationState.beginAttempt({
        branch: 'submit/sub_123',
        outcome: 'automatic',
        resultCode: 'auto_publish',
        submissionId: 'sub_123'
      })
    ).resolves.toBe(false)
  })

  it('atomically records retry and releases only locks owned by the same submission', async () => {
    await expect(
      recordFinalSubmissionOutcome({
        fields: FIELDS,
        outcome: 'retry_later',
        reasonCode: 'reputation_unknown',
        submissionId: 'sub_123'
      })
    ).resolves.toBe(true)

    const invocation = mockEval.mock.calls[0]
    expect(invocation?.[0]).toContain('record.state = ARGV[2]')
    expect(invocation?.[0]).toContain('website == ARGV[1]')
    expect(invocation?.[0]).toContain("redis.call('DEL', KEYS[2])")
    expect(invocation?.[0]).toContain('llms == ARGV[1]')
    expect(invocation?.[1]).toHaveLength(3)
    expect(JSON.stringify(invocation)).not.toContain('example.com')
  })

  it('terminalizes an exact recovered candidate without authorizing foreign state', async () => {
    await recordFinalSubmissionOutcome({
      fields: FIELDS,
      outcome: 'rejected',
      reasonCode: 'prohibited_content',
      submissionId: 'sub_123'
    })

    const script = mockEval.mock.calls[0]?.[0]
    expect(script).toContain("record.branch == 'submit/' .. ARGV[1]")
    expect(script).toContain("record.state == 'publishing'")
    expect(script).toContain("record.state == 'publish_failed'")
  })

  it.each([
    ['duplicate', 'rejected', 'duplicate'],
    ['assessment rejection', 'rejected', 'prohibited_content'],
    ['infrastructure retry', 'retry_later', 'publication_unavailable']
  ] as const)('records %s as a typed terminal outcome', async (_label, outcome, reasonCode) => {
    await expect(
      recordFinalSubmissionOutcome({ fields: FIELDS, outcome, reasonCode, submissionId: 'sub_123' })
    ).resolves.toBe(true)
    expect(mockEval.mock.calls[0]?.[2]).toEqual([
      'sub_123',
      outcome,
      reasonCode,
      expect.any(String)
    ])
  })

  it('marks a started publication failed without releasing its recovery locks', async () => {
    await expect(
      submissionPublicationState.markFailed({
        branch: 'submit/sub_123',
        outcome: 'automatic',
        resultCode: 'auto_publish',
        submissionId: 'sub_123'
      })
    ).resolves.toBe(true)

    expect(mockEval.mock.calls[0]?.[0]).toContain("record.state = 'publish_failed'")
    expect(mockEval.mock.calls[0]?.[0]).toContain("record.state == 'final_assessing'")
    expect(mockEval.mock.calls[0]?.[2]).toEqual([
      'failed',
      'submit/sub_123',
      'automatic',
      'auto_publish',
      expect.any(String)
    ])
    expect(mockEval.mock.calls[0]?.[1]).toEqual(['submission:sub_123'])
  })

  it('fails closed for invalid bindings or unavailable Redis', async () => {
    await expect(
      submissionPublicationState.persistGithub({
        branch: 'submit/../../main',
        headSha: 'invalid',
        prNumber: 0,
        submissionId: 'sub_123'
      })
    ).resolves.toBe(false)
    expect(mockEval).not.toHaveBeenCalled()

    mockEval.mockResolvedValue(null)
    await expect(
      submissionPublicationState.markFailed({
        branch: 'submit/sub_123',
        outcome: 'automatic',
        resultCode: 'auto_publish',
        submissionId: 'sub_123'
      })
    ).resolves.toBe(false)
  })
})
