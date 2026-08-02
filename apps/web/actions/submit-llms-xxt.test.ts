import { auth } from '@thedaviddias/auth'
import { logger } from '@thedaviddias/logging'

import { getStoredCSRFToken } from '@/lib/csrf-protection'
import { assessSubmission } from '@/lib/submissions/submission-assessment'
import { checkSubmissionDuplicates } from '@/lib/submissions/submission-duplicates'
import { recordFinalSubmissionOutcome } from '@/lib/submissions/submission-publication-state'
import { publishSubmission } from '@/lib/submissions/submission-publisher'
import {
  acquireSubmissionLocks,
  consumeSubmissionContinuation
} from '@/lib/submissions/submission-state'
import { submitLlmsTxt } from './submit-llms-xxt'

jest.mock('@thedaviddias/auth', () => ({ auth: jest.fn() }))
jest.mock('@thedaviddias/logging', () => ({
  logger: { error: jest.fn(), info: jest.fn(), warn: jest.fn() }
}))
jest.mock('@/lib/csrf-protection', () => ({ getStoredCSRFToken: jest.fn() }))
jest.mock('@/lib/submissions/submission-assessment', () => ({ assessSubmission: jest.fn() }))
jest.mock('@/lib/submissions/submission-duplicates', () => ({
  checkSubmissionDuplicates: jest.fn()
}))
jest.mock('@/lib/submissions/submission-publisher', () => ({ publishSubmission: jest.fn() }))
jest.mock('@/lib/submissions/submission-publication-state', () => ({
  recordFinalSubmissionOutcome: jest.fn()
}))
jest.mock('@/lib/submissions/submission-state', () => ({
  acquireSubmissionLocks: jest.fn(),
  consumeSubmissionContinuation: jest.fn(),
  normalizeSubmissionFields: jest.requireActual('@/lib/submissions/submission-state')
    .normalizeSubmissionFields
}))

const mockAuth = jest.mocked(auth)
const mockLoggerInfo = jest.mocked(logger.info)
const mockCsrf = jest.mocked(getStoredCSRFToken)
const mockConsume = jest.mocked(consumeSubmissionContinuation)
const mockLocks = jest.mocked(acquireSubmissionLocks)
const mockDuplicates = jest.mocked(checkSubmissionDuplicates)
const mockAssess = jest.mocked(assessSubmission)
const mockPublish = jest.mocked(publishSubmission)
const mockRecordOutcome = jest.mocked(recordFinalSubmissionOutcome)

const form = (overrides: Record<string, string> = {}) => {
  const value = new FormData()
  const fields = {
    _csrf: 'csrf-token',
    category: 'developer-tools',
    continuationToken: 'opaque.continuation.signature',
    description:
      'A useful developer platform with clear public documentation for teams building software.',
    followAttested: 'true',
    llmsFullUrl: '',
    llmsUrl: 'https://example.com/llms.txt',
    name: 'Example Platform',
    publishedAt: '2026-08-02',
    supportPlatform: 'x',
    website: 'https://example.com/'
  }
  for (const [key, entry] of Object.entries({ ...fields, ...overrides })) value.set(key, entry)
  return value
}

const autoAssessment = {
  checkedAt: '2026-08-02T12:00:00.000Z',
  decision: 'auto_publish' as const,
  evidence: [],
  policyVersion: '2026-08-01.v1',
  publicMessage: 'Passed.',
  reasonCode: 'passed' as const
}

describe('submitLlmsTxt final coordinator', () => {
  beforeEach(() => {
    mockLoggerInfo.mockClear()
    mockAuth.mockResolvedValue({
      user: {
        email: 'person@example.com',
        id: 'user_123',
        user_metadata: { avatar_url: null, full_name: null, user_name: null }
      }
    })
    mockCsrf.mockResolvedValue({ expiresAt: Date.now() + 60_000, token: 'csrf-token' })
    mockConsume.mockResolvedValue({ mode: 'initial', ok: true, submissionId: 'sub_123' })
    mockLocks.mockResolvedValue({ ok: true })
    mockDuplicates.mockResolvedValue({ status: 'unique' })
    mockAssess.mockResolvedValue(autoAssessment)
    mockPublish.mockResolvedValue({
      ok: true,
      outcome: 'automatic',
      prUrl: 'https://github.com/thedaviddias/llms-txt-hub/pull/42'
    })
    mockRecordOutcome.mockResolvedValue(true)
  })

  it.each([
    ['missing platform', { supportPlatform: '' }],
    ['invalid platform', { supportPlatform: 'threads' }],
    ['missing attestation', { followAttested: 'false' }],
    ['missing continuation', { continuationToken: '' }]
  ])('rejects %s before consuming state', async (_label, overrides) => {
    await expect(submitLlmsTxt(form(overrides))).resolves.toMatchObject({
      outcome: 'rejected',
      success: false
    })
    expect(mockConsume).not.toHaveBeenCalled()
    expect(mockLoggerInfo).toHaveBeenLastCalledWith(
      'Final submission completed',
      expect.objectContaining({
        data: expect.objectContaining({ outcome: 'rejected', reasonCode: 'invalid_input' })
      })
    )
    expect(JSON.stringify(mockLoggerInfo.mock.calls)).not.toContain('opaque.continuation.signature')
  })

  it('atomically consumes unchanged fields, then reruns duplicates and assessment', async () => {
    await expect(submitLlmsTxt(form())).resolves.toEqual({
      outcome: 'automatic',
      prUrl: 'https://github.com/thedaviddias/llms-txt-hub/pull/42',
      success: true
    })
    expect(mockConsume).toHaveBeenCalledTimes(1)
    expect(mockLocks).toHaveBeenCalledWith({
      llmsUrl: 'https://example.com/llms.txt',
      submissionId: 'sub_123',
      website: 'https://example.com/'
    })
    expect(mockConsume.mock.invocationCallOrder[0]).toBeLessThan(
      mockLocks.mock.invocationCallOrder[0] ?? 0
    )
    expect(mockLocks.mock.invocationCallOrder[0]).toBeLessThan(
      mockDuplicates.mock.invocationCallOrder[0] ?? 0
    )
    expect(mockDuplicates).toHaveBeenCalledTimes(1)
    expect(mockAssess).toHaveBeenCalledTimes(1)
    expect(mockPublish).toHaveBeenCalledWith(
      expect.objectContaining({ assessment: autoAssessment, submissionId: 'sub_123' })
    )
  })

  it('allows only one of two concurrent finals to pass exact-once consumption', async () => {
    mockConsume
      .mockResolvedValueOnce({ mode: 'initial', ok: true, submissionId: 'sub_123' })
      .mockResolvedValueOnce({ code: 'replayed', ok: false })

    const results = await Promise.all([submitLlmsTxt(form()), submitLlmsTxt(form())])

    expect(results).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ outcome: 'automatic', success: true }),
        expect.objectContaining({ outcome: 'rejected', success: false })
      ])
    )
    expect(mockLocks).toHaveBeenCalledTimes(1)
    expect(mockPublish).toHaveBeenCalledTimes(1)
  })

  it('never publishes from preflight evidence when the fresh assessment retries', async () => {
    mockAssess.mockResolvedValue({
      ...autoAssessment,
      decision: 'retry_later',
      publicMessage: 'Please retry.',
      reasonCode: 'reputation_unknown'
    })

    await expect(submitLlmsTxt(form())).resolves.toEqual({
      error: 'Please retry.',
      outcome: 'retry_later',
      success: false
    })
    expect(mockPublish).not.toHaveBeenCalled()
    expect(mockRecordOutcome).toHaveBeenCalledWith({
      fields: expect.any(Object),
      outcome: 'retry_later',
      reasonCode: 'reputation_unknown',
      submissionId: 'sub_123'
    })
    expect(mockLoggerInfo).toHaveBeenLastCalledWith(
      'Final submission completed',
      expect.objectContaining({
        data: expect.objectContaining({
          outcome: 'retry_later',
          reasonCode: 'reputation_unknown'
        })
      })
    )
  })

  it('fails closed when continuation consumption or duplicate status is unavailable', async () => {
    mockConsume.mockResolvedValue({ code: 'publication_unavailable', ok: false })
    await expect(submitLlmsTxt(form())).resolves.toMatchObject({
      outcome: 'retry_later',
      success: false
    })
    expect(mockDuplicates).not.toHaveBeenCalled()
  })

  it.each([
    ['conflict', { code: 'duplicate', ok: false }, 'rejected'],
    ['Redis unavailable', { code: 'publication_unavailable', ok: false }, 'retry_later']
  ] as const)(
    'does not inspect or publish when final lock acquisition reports %s',
    async (_label, lock, outcome) => {
      mockLocks.mockResolvedValue(lock)

      await expect(submitLlmsTxt(form())).resolves.toMatchObject({ outcome, success: false })
      expect(mockDuplicates).not.toHaveBeenCalled()
      expect(mockAssess).not.toHaveBeenCalled()
      expect(mockPublish).not.toHaveBeenCalled()
      expect(mockRecordOutcome).toHaveBeenCalledWith(
        expect.objectContaining({
          outcome,
          reasonCode: outcome === 'rejected' ? 'duplicate' : 'publication_unavailable'
        })
      )
    }
  )

  it('returns the publisher manual outcome without claiming automatic publication', async () => {
    mockPublish.mockResolvedValue({
      ok: true,
      outcome: 'manual',
      prUrl: 'https://github.com/thedaviddias/llms-txt-hub/pull/42'
    })

    await expect(submitLlmsTxt(form({ supportPlatform: 'linkedin' }))).resolves.toEqual({
      outcome: 'manual',
      prUrl: 'https://github.com/thedaviddias/llms-txt-hub/pull/42',
      success: true
    })
  })

  it('does not assess or publish a fresh duplicate', async () => {
    mockDuplicates.mockResolvedValue({ source: 'catalogue', status: 'duplicate' })

    await expect(submitLlmsTxt(form())).resolves.toMatchObject({
      outcome: 'rejected',
      success: false
    })
    expect(mockAssess).not.toHaveBeenCalled()
    expect(mockPublish).not.toHaveBeenCalled()
    expect(mockRecordOutcome).toHaveBeenCalledWith({
      fields: expect.any(Object),
      outcome: 'rejected',
      reasonCode: 'duplicate',
      submissionId: 'sub_123'
    })
    expect(mockLoggerInfo).toHaveBeenLastCalledWith(
      'Final submission completed',
      expect.objectContaining({
        data: expect.objectContaining({ outcome: 'rejected', reasonCode: 'duplicate' })
      })
    )
  })

  it('continues same-ID reconciliation when the deterministic PR already exists', async () => {
    mockDuplicates.mockResolvedValue({
      branch: 'submit/sub_123',
      headSha: 'a'.repeat(40),
      prNumber: 42,
      status: 'reconcile'
    })

    await expect(submitLlmsTxt(form())).resolves.toMatchObject({
      outcome: 'automatic',
      success: true
    })
    expect(mockAssess).toHaveBeenCalledTimes(1)
    expect(mockPublish).toHaveBeenCalledTimes(1)
    expect(mockRecordOutcome).not.toHaveBeenCalled()
  })

  it('returns the same PR when the client retries an unexpired recovery token after response loss', async () => {
    mockConsume
      .mockResolvedValueOnce({ mode: 'initial', ok: true, submissionId: 'sub_123' })
      .mockResolvedValueOnce({
        mode: 'recovery',
        ok: true,
        state: 'publishing',
        submissionId: 'sub_123'
      })
    mockDuplicates.mockResolvedValueOnce({ status: 'unique' }).mockResolvedValueOnce({
      branch: 'submit/sub_123',
      headSha: 'a'.repeat(40),
      prNumber: 42,
      status: 'reconcile'
    })

    const first = await submitLlmsTxt(form())
    const recovered = await submitLlmsTxt(form())

    expect(first).toEqual(recovered)
    expect(mockPublish).toHaveBeenCalledTimes(2)
    expect(mockPublish).toHaveBeenNthCalledWith(
      2,
      expect.objectContaining({ submissionId: 'sub_123' })
    )
  })

  it('fails closed before publishing when the terminal state transition is unavailable', async () => {
    mockAssess.mockResolvedValue({
      ...autoAssessment,
      decision: 'reject',
      publicMessage: 'Rejected.',
      reasonCode: 'prohibited_content'
    })
    mockRecordOutcome.mockResolvedValue(false)

    await expect(submitLlmsTxt(form())).resolves.toMatchObject({
      outcome: 'retry_later',
      success: false
    })
    expect(mockPublish).not.toHaveBeenCalled()
  })

  it('preserves recovery locks after a started publisher failure', async () => {
    mockPublish.mockResolvedValue({
      code: 'publication_unavailable',
      ok: false,
      recovery: 'same_submission'
    })

    await expect(submitLlmsTxt(form())).resolves.toMatchObject({
      outcome: 'retry_later',
      success: false
    })
    expect(mockRecordOutcome).not.toHaveBeenCalled()
  })

  it('releases owned locks when publication cannot start', async () => {
    mockPublish.mockResolvedValue({
      code: 'publication_unavailable',
      ok: false,
      recovery: 'fresh_preflight'
    })

    await expect(submitLlmsTxt(form())).resolves.toMatchObject({
      outcome: 'retry_later',
      success: false
    })
    expect(mockRecordOutcome).toHaveBeenCalledWith({
      fields: expect.any(Object),
      outcome: 'retry_later',
      reasonCode: 'publication_unavailable',
      submissionId: 'sub_123'
    })
  })
})
