import { createHmac, randomBytes, timingSafeEqual } from 'node:crypto'

/**

 * The two supported maintainer profiles.

 */
export type SupportPlatform = 'x' | 'linkedin'

interface ReceiptOptions {
  now?: number
  secret?: string
}

const LIFETIME_MS = 48 * 60 * 60 * 1000
const TOKEN_PART = /^[A-Za-z0-9_-]+$/
/**
 * Read the configured support signing key.
 */
const signingSecret = (options: ReceiptOptions) =>
  options.secret ?? process.env.SUBMISSION_ASSESSMENT_SIGNING_SECRET ?? ''
/**
 * Bind the payload and account with a purpose-specific HMAC prefix.
 */
const signature = (payload: string, userId: string, secret: string) =>
  createHmac('sha256', secret)
    .update(JSON.stringify(['submission-support-v1', userId, payload]))
    .digest()

/**

 * Issue a short-lived, user-bound record of a profile-click request.

 */
export function createSupportReceipt(
  platform: SupportPlatform,
  userId: string,
  options: ReceiptOptions = {}
): string | null {
  const secret = signingSecret(options)
  if (!userId || Buffer.byteLength(secret) < 32 || !['x', 'linkedin'].includes(platform))
    return null
  const payload = Buffer.from(
    JSON.stringify({
      expiresAt: (options.now ?? Date.now()) + LIFETIME_MS,
      nonce: randomBytes(16).toString('base64url'),
      platform
    })
  ).toString('base64url')
  return `${payload}.${signature(payload, userId, secret).toString('base64url')}`
}

/**

 * Validate the support receipt without trusting client-supplied platform or identity.

 */
export function verifySupportReceipt(
  token: unknown,
  userId: string,
  options: ReceiptOptions = {}
): SupportPlatform | null {
  const secret = signingSecret(options)
  if (!userId || Buffer.byteLength(secret) < 32 || typeof token !== 'string' || token.length > 512)
    return null
  const [payload, supplied, extra] = token.split('.')
  if (
    !payload ||
    !supplied ||
    extra !== undefined ||
    !TOKEN_PART.test(payload) ||
    !TOKEN_PART.test(supplied)
  )
    return null
  const expected = signature(payload, userId, secret)
  const actual = Buffer.from(supplied, 'base64url')
  if (
    actual.length !== expected.length ||
    actual.toString('base64url') !== supplied ||
    !timingSafeEqual(expected, actual)
  )
    return null
  try {
    const value: unknown = JSON.parse(Buffer.from(payload, 'base64url').toString('utf8'))
    if (!value || typeof value !== 'object' || !('expiresAt' in value) || !('platform' in value))
      return null
    const now = options.now ?? Date.now()
    if (
      typeof value.expiresAt !== 'number' ||
      !Number.isSafeInteger(value.expiresAt) ||
      value.expiresAt <= now ||
      value.expiresAt > now + LIFETIME_MS
    )
      return null
    return value.platform === 'x' || value.platform === 'linkedin' ? value.platform : null
  } catch {
    return null
  }
}
