import { createSupportReceipt, verifySupportReceipt } from './submission-support'

const secret = 'local-test-secret-with-at-least-32-bytes'
const now = 1_800_000_000_000

describe('submission support receipts', () => {
  it.each(['x', 'linkedin'] as const)('binds a %s click to the authenticated user', platform => {
    const token = createSupportReceipt(platform, 'user_123', { now, secret })
    expect(token).toEqual(expect.any(String))
    expect(verifySupportReceipt(token, 'user_123', { now, secret })).toBe(platform)
    expect(verifySupportReceipt(token, 'another_user', { now, secret })).toBeNull()
  })

  it('rejects tampering, expiry, malformed tokens and missing signing configuration', () => {
    const token = createSupportReceipt('x', 'user_123', { now, secret })
    expect(verifySupportReceipt(`${token}a`, 'user_123', { now, secret })).toBeNull()
    expect(
      verifySupportReceipt(token, 'user_123', { now: now + 49 * 60 * 60 * 1000, secret })
    ).toBeNull()
    expect(verifySupportReceipt('a'.repeat(1024), 'user_123', { now, secret })).toBeNull()
    expect(verifySupportReceipt(null, 'user_123', { now, secret })).toBeNull()
    expect(verifySupportReceipt(token, 'user_123', { now, secret: '' })).toBeNull()
    expect(createSupportReceipt('x', 'user_123', { now, secret: '' })).toBeNull()
  })

  it('cannot change the chosen platform without a new signature', () => {
    const token = createSupportReceipt('x', 'user_123', { now, secret })
    if (!token) throw new Error('Expected a signed receipt')
    const [payload, signature] = token.split('.')
    if (!payload) throw new Error('Expected payload')
    const decoded = JSON.parse(Buffer.from(payload, 'base64url').toString('utf8'))
    decoded.platform = 'linkedin'
    const modified = `${Buffer.from(JSON.stringify(decoded)).toString('base64url')}.${signature}`
    expect(verifySupportReceipt(modified, 'user_123', { now, secret })).toBeNull()
  })
})
