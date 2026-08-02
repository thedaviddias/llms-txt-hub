import { auth } from '@thedaviddias/auth'
import { logger } from '@thedaviddias/logging'
import type { SubmissionAssessment, SubmissionDecision } from '@thedaviddias/submission-trust/types'
import { headers } from 'next/headers'

import { getStoredCSRFToken } from '@/lib/csrf-protection'
import { assessSubmission } from '@/lib/submissions/submission-assessment'
import { checkSubmissionDuplicates } from '@/lib/submissions/submission-duplicates'
import {
  createSubmissionContinuation,
  enforceSubmissionRateLimits
} from '@/lib/submissions/submission-state'
import { preflightSubmission } from './preflight-submission'

jest.mock('@thedaviddias/auth', () => ({ auth: jest.fn() }))
jest.mock('@thedaviddias/logging', () => ({
  logger: { error: jest.fn(), info: jest.fn(), warn: jest.fn() }
}))
jest.mock('next/headers', () => ({ headers: jest.fn() }))
jest.mock('@/lib/csrf-protection', () => ({ getStoredCSRFToken: jest.fn() }))
jest.mock('@/lib/submissions/submission-assessment', () => ({ assessSubmission: jest.fn() }))
jest.mock('@/lib/submissions/submission-duplicates', () => ({
  checkSubmissionDuplicates: jest.fn()
}))
jest.mock('@/lib/submissions/submission-state', () => ({
  createSubmissionContinuation: jest.fn(),
  enforceSubmissionRateLimits: jest.fn(),
  normalizeSubmissionFields: jest.requireActual('@/lib/submissions/submission-state')
    .normalizeSubmissionFields
}))

const mockAuth = jest.mocked(auth)
const mockLoggerInfo = jest.mocked(logger.info)
const mockHeaders = jest.mocked(headers)
const mockCsrf = jest.mocked(getStoredCSRFToken)
const mockAssess = jest.mocked(assessSubmission)
const mockDuplicates = jest.mocked(checkSubmissionDuplicates)
const mockContinuation = jest.mocked(createSubmissionContinuation)
const mockRateLimits = jest.mocked(enforceSubmissionRateLimits)

const fields = {
  category: 'developer-tools',
  description:
    'A useful developer platform with clear public documentation for teams building software.',
  llmsFullUrl: 'https://example.com/llms-full.txt#section',
  llmsUrl: 'https://example.com/llms.txt#section',
  name: ' Example Platform ',
  publishedAt: '2026-08-02',
  website: 'https://example.com/#home'
}

const form = (overrides: Record<string, string> = {}) => {
  const value = new FormData()
  for (const [key, entry] of Object.entries({ ...fields, _csrf: 'csrf-token', ...overrides })) {
    value.set(key, entry)
  }
  return value
}

const assessment = (decision: SubmissionDecision): SubmissionAssessment => {
  const base = {
    checkedAt: '2026-08-02T12:00:00.000Z',
    evidence: [
      {
        check: 'reputation' as const,
        decision: 'auto_publish' as const,
        details: { providerStatus: 'safe' as const },
        reasonCode: 'passed' as const,
        resource: 'homepage' as const
      }
    ],
    policyVersion: '2026-08-01.v1',
    publicMessage: decision === 'reject' ? 'This submission cannot be accepted.' : 'Checked.'
  }
  if (decision === 'auto_publish') return { ...base, decision, reasonCode: 'passed' }
  if (decision === 'manual_review') {
    return { ...base, decision, reasonCode: 'editorial_uncertainty' }
  }
  if (decision === 'reject') return { ...base, decision, reasonCode: 'prohibited_content' }
  return { ...base, decision, reasonCode: 'publication_unavailable' }
}

describe('preflightSubmission', () => {
  beforeEach(() => {
    mockLoggerInfo.mockClear()
    mockAuth.mockResolvedValue({
      user: {
        email: 'person@example.com',
        id: 'user_123',
        user_metadata: { avatar_url: null, full_name: null, user_name: null }
      }
    })
    mockHeaders.mockResolvedValue(
      new Headers({ 'x-forwarded-for': '203.0.113.20, 10.0.0.1' }) as never
    )
    mockCsrf.mockResolvedValue({ expiresAt: Date.now() + 60_000, token: 'csrf-token' })
    mockRateLimits.mockResolvedValue({ ok: true })
    mockDuplicates.mockResolvedValue({ status: 'unique' })
    mockAssess.mockResolvedValue(assessment('auto_publish'))
    mockContinuation.mockResolvedValue({
      continuationToken: 'opaque.continuation.signature',
      ok: true,
      record: {} as never
    })
  })

  it('normalizes every Step 2 field and performs all gates before support', async () => {
    const result = await preflightSubmission(form())

    expect(result).toMatchObject({
      analytics: { reasonCategory: 'passed', webRiskAvailable: true },
      continuationToken: 'opaque.continuation.signature',
      status: 'support_required'
    })
    expect(mockRateLimits).toHaveBeenCalledWith({
      sourceIp: '203.0.113.20',
      userId: 'user_123',
      website: 'https://example.com/'
    })
    expect(mockDuplicates).toHaveBeenCalledWith(
      expect.objectContaining({
        llmsFullUrl: 'https://example.com/llms-full.txt',
        llmsUrl: 'https://example.com/llms.txt',
        website: 'https://example.com/'
      })
    )
    expect(mockAssess).toHaveBeenCalledWith({
      ...fields,
      llmsFullUrl: 'https://example.com/llms-full.txt',
      llmsUrl: 'https://example.com/llms.txt',
      name: 'Example Platform',
      website: 'https://example.com/'
    })
    expect(mockContinuation).toHaveBeenCalledWith(expect.objectContaining({ userId: 'user_123' }))
    expect(mockLoggerInfo).toHaveBeenLastCalledWith(
      'Submission preflight completed',
      expect.objectContaining({
        data: expect.objectContaining({ outcome: 'support_required', reasonCode: 'passed' })
      })
    )
  })

  it.each([
    ['reject', 'rejected'],
    ['retry_later', 'retry_later']
  ] as const)('returns a safe %s result without support state', async (decision, status) => {
    mockAssess.mockResolvedValue(assessment(decision))

    await expect(preflightSubmission(form())).resolves.toMatchObject({ status })
    expect(mockContinuation).not.toHaveBeenCalled()
    expect(mockLoggerInfo).toHaveBeenLastCalledWith(
      'Submission preflight completed',
      expect.objectContaining({
        data: expect.objectContaining({ outcome: status })
      })
    )
  })

  it('allows a security-cleared manual assessment to reach support', async () => {
    mockAssess.mockResolvedValue(assessment('manual_review'))

    await expect(preflightSubmission(form())).resolves.toMatchObject({
      status: 'support_required'
    })
    expect(mockContinuation).toHaveBeenCalledTimes(1)
  })

  it('allows abandoned, lost-response, and concurrent preflights without reserving URLs', async () => {
    mockContinuation
      .mockResolvedValueOnce({
        continuationToken: 'first.signature',
        ok: true,
        record: {} as never
      })
      .mockResolvedValueOnce({
        continuationToken: 'second.signature',
        ok: true,
        record: {} as never
      })

    const [first, second] = await Promise.all([
      preflightSubmission(form()),
      preflightSubmission(form())
    ])

    expect(first.status).toBe('support_required')
    expect(second.status).toBe('support_required')
    expect(mockContinuation).toHaveBeenCalledTimes(2)
  })

  it('rejects an invalid CSRF token before rate limits or network checks', async () => {
    const result = await preflightSubmission(form({ _csrf: 'wrong-token' }))
    expect(result).toMatchObject({
      analytics: { reasonCategory: 'request_security' },
      status: 'rejected'
    })
    expect(result.analytics).not.toHaveProperty('webRiskAvailable')
    expect(mockRateLimits).not.toHaveBeenCalled()
    expect(mockDuplicates).not.toHaveBeenCalled()
    expect(mockAssess).not.toHaveBeenCalled()
    expect(mockLoggerInfo).toHaveBeenLastCalledWith(
      'Submission preflight completed',
      expect.objectContaining({
        data: expect.objectContaining({ outcome: 'rejected', reasonCode: 'csrf_invalid' })
      })
    )
    const logged = JSON.stringify(mockLoggerInfo.mock.calls)
    expect(logged).not.toContain('wrong-token')
    expect(logged).not.toContain('203.0.113.20')
    expect(logged).not.toContain('opaque.continuation.signature')
  })

  it('reports authentication without claiming Web Risk was checked', async () => {
    mockAuth.mockResolvedValueOnce(null)

    const result = await preflightSubmission(form())

    expect(result).toMatchObject({
      analytics: { reasonCategory: 'identity' },
      status: 'retry_later'
    })
    expect(result.analytics).not.toHaveProperty('webRiskAvailable')
    expect(mockAssess).not.toHaveBeenCalled()
  })

  it('fails closed before assessment when identity, CSRF, limits, or duplicates fail', async () => {
    mockRateLimits.mockResolvedValue({ code: 'rate_limited', ok: false, scope: 'domain' })
    await expect(preflightSubmission(form())).resolves.toMatchObject({
      reasonCode: 'rate_limited',
      status: 'retry_later'
    })
    expect(mockDuplicates).not.toHaveBeenCalled()
    expect(mockAssess).not.toHaveBeenCalled()
  })

  it('returns duplicate rejection without assessing or publishing', async () => {
    mockDuplicates.mockResolvedValue({ source: 'catalogue', status: 'duplicate' })

    await expect(preflightSubmission(form())).resolves.toMatchObject({
      reasonCode: 'duplicate',
      status: 'rejected'
    })
    expect(mockAssess).not.toHaveBeenCalled()
    expect(mockContinuation).not.toHaveBeenCalled()
  })

  it('reports an editorial rejection after a completed Web Risk check', async () => {
    mockAssess.mockResolvedValue(assessment('reject'))

    await expect(preflightSubmission(form())).resolves.toMatchObject({
      analytics: { reasonCategory: 'editorial', webRiskAvailable: true },
      reasonCode: 'prohibited_content',
      status: 'rejected'
    })
  })

  it('reports hidden reputation uncertainty even when another outcome is selected', async () => {
    mockAssess.mockResolvedValue({
      ...assessment('reject'),
      evidence: [
        {
          check: 'reputation',
          decision: 'retry_later',
          details: { providerStatus: 'unknown' },
          reasonCode: 'reputation_unknown',
          resource: 'llms'
        }
      ]
    })

    await expect(preflightSubmission(form())).resolves.toMatchObject({
      analytics: { reasonCategory: 'editorial', webRiskAvailable: false },
      status: 'rejected'
    })
  })
})
