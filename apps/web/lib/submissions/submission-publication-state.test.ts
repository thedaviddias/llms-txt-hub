import { evalRedis } from '@/lib/redis'
import { submissionPublicationState } from './submission-publication-state'

jest.mock('@/lib/redis', () => ({ evalRedis: jest.fn() }))

const mockEval = jest.mocked(evalRedis)

describe('submission publication state', () => {
  beforeEach(() => mockEval.mockResolvedValue('updated'))

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

  it('persists PR number and exact head before completing publication', async () => {
    await submissionPublicationState.persistGithub({
      branch: 'submit/sub_123',
      headSha: 'a'.repeat(40),
      prNumber: 42,
      submissionId: 'sub_123'
    })
    await submissionPublicationState.markComplete('sub_123')

    expect(mockEval.mock.calls[0]?.[2]).toEqual([
      'github',
      'submit/sub_123',
      '42',
      'a'.repeat(40),
      expect.any(String)
    ])
    expect(mockEval.mock.calls[1]?.[2]).toEqual(['complete', '', '', '', expect.any(String)])
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
    await expect(submissionPublicationState.markComplete('sub_123')).resolves.toBe(false)
  })
})
