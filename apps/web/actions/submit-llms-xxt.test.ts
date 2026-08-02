import { auth } from '@thedaviddias/auth'

import { getStoredCSRFToken } from '@/lib/csrf-protection'
import { assessSubmission } from '@/lib/submissions/submission-assessment'
import { checkSubmissionDuplicates } from '@/lib/submissions/submission-duplicates'
import { publishSubmission } from '@/lib/submissions/submission-publisher'
import { consumeSubmissionContinuation } from '@/lib/submissions/submission-state'
import { submitLlmsTxt } from './submit-llms-xxt'

jest.mock('@thedaviddias/auth', () => ({ auth: jest.fn() }))
jest.mock('@/lib/csrf-protection', () => ({ getStoredCSRFToken: jest.fn() }))
jest.mock('@/lib/submissions/submission-assessment', () => ({ assessSubmission: jest.fn() }))
jest.mock('@/lib/submissions/submission-duplicates', () => ({
  checkSubmissionDuplicates: jest.fn()
}))
jest.mock('@/lib/submissions/submission-publisher', () => ({ publishSubmission: jest.fn() }))
jest.mock('@/lib/submissions/submission-state', () => ({
  consumeSubmissionContinuation: jest.fn(),
  normalizeSubmissionFields: jest.requireActual('@/lib/submissions/submission-state')
    .normalizeSubmissionFields
}))

const mockAuth = jest.mocked(auth)
const mockCsrf = jest.mocked(getStoredCSRFToken)
const mockConsume = jest.mocked(consumeSubmissionContinuation)
const mockDuplicates = jest.mocked(checkSubmissionDuplicates)
const mockAssess = jest.mocked(assessSubmission)
const mockPublish = jest.mocked(publishSubmission)

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
    mockAuth.mockResolvedValue({
      user: {
        email: 'person@example.com',
        id: 'user_123',
        user_metadata: { avatar_url: null, full_name: null, user_name: null }
      }
    })
    mockCsrf.mockResolvedValue({ expiresAt: Date.now() + 60_000, token: 'csrf-token' })
    mockConsume.mockResolvedValue({ ok: true, submissionId: 'sub_123' })
    mockDuplicates.mockResolvedValue({ status: 'unique' })
    mockAssess.mockResolvedValue(autoAssessment)
    mockPublish.mockResolvedValue({
      ok: true,
      outcome: 'automatic',
      prUrl: 'https://github.com/thedaviddias/llms-txt-hub/pull/42'
    })
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
  })

  it('atomically consumes unchanged fields, then reruns duplicates and assessment', async () => {
    await expect(submitLlmsTxt(form())).resolves.toEqual({
      outcome: 'automatic',
      prUrl: 'https://github.com/thedaviddias/llms-txt-hub/pull/42',
      success: true
    })
    expect(mockConsume).toHaveBeenCalledTimes(1)
    expect(mockDuplicates).toHaveBeenCalledTimes(1)
    expect(mockAssess).toHaveBeenCalledTimes(1)
    expect(mockPublish).toHaveBeenCalledWith(
      expect.objectContaining({ assessment: autoAssessment, submissionId: 'sub_123' })
    )
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
  })

  it('fails closed when continuation consumption or duplicate status is unavailable', async () => {
    mockConsume.mockResolvedValue({ code: 'publication_unavailable', ok: false })
    await expect(submitLlmsTxt(form())).resolves.toMatchObject({
      outcome: 'retry_later',
      success: false
    })
    expect(mockDuplicates).not.toHaveBeenCalled()
  })

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
  })
})
