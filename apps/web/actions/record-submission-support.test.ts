import { auth } from '@thedaviddias/auth'
import { getStoredCSRFToken } from '@/lib/csrf-protection'
import { recordSubmissionSupport } from './record-submission-support'

jest.mock('@thedaviddias/auth', () => ({ auth: jest.fn() }))
jest.mock('@/lib/csrf-protection', () => ({ getStoredCSRFToken: jest.fn() }))

interface InputOptions {
  csrf?: string
  platform?: string
}

/** Build one social acknowledgement form payload. */
function input({ platform = 'x', csrf = 'csrf-token' }: InputOptions = {}) {
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

  it('records either allowlisted social choice without issuing an authorization token', async () => {
    for (const platform of ['x', 'linkedin']) {
      const result = await recordSubmissionSupport(input({ platform }))
      expect(result).toEqual({ success: true })
    }
  })

  it('requires authentication, CSRF and an allowed platform', async () => {
    expect(await recordSubmissionSupport(input({ platform: 'threads' }))).toMatchObject({
      success: false
    })
    expect(await recordSubmissionSupport(input({ csrf: 'wrong' }))).toMatchObject({
      success: false
    })
    jest.mocked(auth).mockResolvedValue(null)
    expect(await recordSubmissionSupport(input())).toMatchObject({ success: false })
  })

  it('does not depend on the submission signing secret', async () => {
    delete process.env.SUBMISSION_ASSESSMENT_SIGNING_SECRET
    expect(await recordSubmissionSupport(input())).toEqual({ success: true })
  })
})
