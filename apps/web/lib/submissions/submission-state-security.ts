import { createHash, createHmac, timingSafeEqual } from 'node:crypto'

import { validateSubmissionUrl } from '@thedaviddias/submission-trust/url-policy'

import type { NormalizedSubmissionFields, SubmissionState } from './submission-state'

/** Shared 48-hour lifetime for records, locks, and continuations. */
export const SUBMISSION_RECORD_TTL_SECONDS = 48 * 60 * 60

/** Maximum accepted continuation length before any parsing or decoding. */
export const MAX_CONTINUATION_CHARACTERS = 512

/** Canonical submission identifier syntax. */
export const SUBMISSION_ID_PATTERN = /^[A-Za-z0-9_-]{1,128}$/

/** Exact-once support-to-final Redis compare-and-transition script. */
export const FINAL_ASSESSMENT_SCRIPT = `
local raw = redis.call('GET', KEYS[1])
if not raw then return 'missing' end
local record = cjson.decode(raw)
if record.state ~= 'support_required' then return 'state_mismatch' end
if record.userId ~= ARGV[1] or record.fieldsHash ~= ARGV[2] then return 'binding_mismatch' end
if record.expiresAt <= ARGV[3] then return 'expired' end
record.state = 'final_assessing'
record.updatedAt = ARGV[3]
redis.call('SET', KEYS[1], cjson.encode(record), 'EX', ARGV[4])
return 'transitioned'
`.trim()

/** Atomic, idempotent dual-URL lock acquisition script. */
export const ACQUIRE_SUBMISSION_LOCKS_SCRIPT = `
local website = redis.call('GET', KEYS[1])
local llms = redis.call('GET', KEYS[2])
if (website and website ~= ARGV[1]) or (llms and llms ~= ARGV[1]) then return 'conflict' end
redis.call('SET', KEYS[1], ARGV[1], 'EX', ARGV[2])
redis.call('SET', KEYS[2], ARGV[1], 'EX', ARGV[2])
return 'acquired'
`.trim()

/** Atomic three-scope submission rate-limit script. */
export const SUBMISSION_RATE_LIMIT_SCRIPT = `
local account = tonumber(redis.call('GET', KEYS[1]) or '0')
local source = tonumber(redis.call('GET', KEYS[2]) or '0')
local domain = tonumber(redis.call('GET', KEYS[3]) or '0')
if account >= tonumber(ARGV[1]) then return 'account' end
if source >= tonumber(ARGV[2]) then return 'source_ip' end
if domain >= tonumber(ARGV[3]) then return 'domain' end
local accountNext = redis.call('INCR', KEYS[1])
local sourceNext = redis.call('INCR', KEYS[2])
local domainNext = redis.call('INCR', KEYS[3])
if accountNext == 1 then redis.call('EXPIRE', KEYS[1], ARGV[4]) end
if sourceNext == 1 then redis.call('EXPIRE', KEYS[2], ARGV[5]) end
if domainNext == 1 then redis.call('EXPIRE', KEYS[3], ARGV[6]) end
return 'allowed'
`.trim()

const MINIMUM_SECRET_BYTES = 32
const TOKEN_PART = /^[A-Za-z0-9_-]+$/
const STATE_TRANSITIONS: Readonly<Record<SubmissionState, readonly SubmissionState[]>> = {
  auto_publish_pending: ['publishing', 'published', 'publish_failed'],
  draft: ['preflight_rejected', 'support_required'],
  final_assessing: ['rejected', 'retry_later', 'manual_review', 'auto_publish_pending'],
  manual_review: [],
  preflight_rejected: [],
  publish_failed: [],
  published: [],
  publishing: [],
  rejected: [],
  retry_later: [],
  support_required: ['final_assessing']
}

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value)

const isBoundedString = (value: unknown): value is string =>
  typeof value === 'string' && value.length > 0 && value.length <= 10_000

const isSubmissionState = (value: string): value is SubmissionState =>
  Object.hasOwn(STATE_TRANSITIONS, value)

/** Internal cryptographic and canonicalization operations for submission state. */
export const submissionStateSecurity = {
  continuationSignature(
    submissionId: string,
    nonce: string,
    userId: string,
    fieldsHash: string,
    expiresAt: string,
    secret: string
  ): Buffer {
    return createHmac('sha256', secret)
      .update(JSON.stringify([submissionId, nonce, userId, fieldsHash, expiresAt]))
      .digest()
  },
  hashFields(fields: NormalizedSubmissionFields): string {
    return createHash('sha256')
      .update(
        JSON.stringify([
          fields.name,
          fields.description,
          fields.website,
          fields.llmsUrl,
          fields.llmsFullUrl ?? '',
          fields.category,
          fields.publishedAt
        ])
      )
      .digest('hex')
  },
  hashIp(sourceIp: string, secret: string): string {
    return createHmac('sha256', secret).update(sourceIp).digest('hex')
  },
  hashString(value: string): string {
    return createHash('sha256').update(value).digest('hex')
  },
  isAllowedTransition(from: string, to: string): boolean {
    return isSubmissionState(from) && isSubmissionState(to) && STATE_TRANSITIONS[from].includes(to)
  },
  isState(value: string): value is SubmissionState {
    return isSubmissionState(value)
  },
  isSecretValid(secret: string): boolean {
    return Buffer.byteLength(secret, 'utf8') >= MINIMUM_SECRET_BYTES
  },
  normalizeFields(input: unknown): NormalizedSubmissionFields | null {
    if (!isRecord(input)) return null
    if (
      !isBoundedString(input.category) ||
      !isBoundedString(input.description) ||
      !isBoundedString(input.llmsUrl) ||
      !isBoundedString(input.name) ||
      !isBoundedString(input.publishedAt) ||
      !isBoundedString(input.website) ||
      (input.llmsFullUrl !== undefined && !isBoundedString(input.llmsFullUrl))
    ) {
      return null
    }

    const website = validateSubmissionUrl(input.website)
    const llmsUrl = validateSubmissionUrl(input.llmsUrl)
    const llmsFullUrl = input.llmsFullUrl ? validateSubmissionUrl(input.llmsFullUrl) : undefined
    if (!website.ok || !llmsUrl.ok || (llmsFullUrl && !llmsFullUrl.ok)) return null

    const normalized: NormalizedSubmissionFields = {
      category: input.category.trim(),
      description: input.description.trim(),
      llmsUrl: llmsUrl.normalizedUrl,
      name: input.name.trim(),
      publishedAt: input.publishedAt.trim(),
      website: website.normalizedUrl
    }
    if (
      !normalized.category ||
      !normalized.description ||
      !normalized.name ||
      !normalized.publishedAt
    ) {
      return null
    }
    if (llmsFullUrl?.ok) normalized.llmsFullUrl = llmsFullUrl.normalizedUrl
    return normalized
  },
  recordKey(submissionId: string): string {
    return `submission:${submissionId}`
  },
  safeEqual(expected: Buffer, supplied: string): boolean {
    if (!TOKEN_PART.test(supplied)) return false
    const decoded = Buffer.from(supplied, 'base64url')
    return (
      decoded.toString('base64url') === supplied &&
      decoded.byteLength === expected.byteLength &&
      timingSafeEqual(expected, decoded)
    )
  }
}
