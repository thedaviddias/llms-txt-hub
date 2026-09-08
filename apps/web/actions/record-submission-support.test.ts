import { auth } from '@thedaviddias/auth'
import { getStoredCSRFToken } from '@/lib/csrf-protection'
import { verifySupportReceipt } from '@/lib/submissions/submission-support'
import { recordSubmissionSupport } from './record-submission-support'

jest.mock('@thedaviddias/auth', () => ({ auth: jest.fn() }))
jest.mock('@/lib/csrf-protection', () => ({ getStoredCSRFToken: jest.fn() }))

const input = (platform = 'x', csrf = 'csrf-token') => {
  const form = new FormData()
  form.set('supportPlatform', platform)
  form.set('_csrf', csrf)
  return form
}

describe('recordSubmissionSupport', () => {
  beforeEach(() => {
    process.env.SUBMISSION_ASSESSMENT_SIGNING_SECRET = 'local-test-secret-with-at-least-32-bytes'
    jest.mocked(auth).mockResolvedValue({
      user: {
        id: 'user_123',
        email: 'test@example.com',
        user_metadata: { avatar_url: null, full_name: null, user_name: null }
      }
    })
    jest
      .mocked(getStoredCSRFToken)
      .mockResolvedValue({ token: 'csrf-token', expiresAt: Date.now() + 60_000 })
  })

  it('returns a usable signed receipt for either profile', async () => {
    for (const platform of ['x', 'linkedin']) {
      const result = await recordSubmissionSupport(input(platform))
      expect(result.success).toBe(true)
      if (result.success) expect(verifySupportReceipt(result.token, 'user_123')).toBe(platform)
    }
  })

  it('requires authentication, CSRF and an allowed platform', async () => {
    expect(await recordSubmissionSupport(input('threads'))).toMatchObject({ success: false })
    expect(await recordSubmissionSupport(input('x', 'wrong'))).toMatchObject({ success: false })
    jest.mocked(auth).mockResolvedValue(null)
    expect(await recordSubmissionSupport(input())).toMatchObject({ success: false })
  })

  it('fails safely when signing is unavailable', async () => {
    delete process.env.SUBMISSION_ASSESSMENT_SIGNING_SECRET
    expect(await recordSubmissionSupport(input())).toMatchObject({ success: false })
  })
})
