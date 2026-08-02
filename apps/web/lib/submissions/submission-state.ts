import { randomBytes } from 'node:crypto'

import type { SubmissionFields } from '@thedaviddias/submission-trust/types'
import { validateSubmissionUrl } from '@thedaviddias/submission-trust/url-policy'

import { evalRedis, get, setNx } from '@/lib/redis'
import {
  ACQUIRE_SUBMISSION_LOCKS_SCRIPT,
  FINAL_ASSESSMENT_SCRIPT,
  MAX_CONTINUATION_CHARACTERS,
  SUBMISSION_ID_PATTERN,
  SUBMISSION_RATE_LIMIT_SCRIPT,
  SUBMISSION_RECORD_TTL_SECONDS,
  submissionStateSecurity
} from './submission-state-security'

/** Durable states for one trusted directory submission. */
export type SubmissionState =
  | 'draft'
  | 'preflight_rejected'
  | 'support_required'
  | 'final_assessing'
  | 'rejected'
  | 'retry_later'
  | 'manual_review'
  | 'auto_publish_pending'
  | 'publishing'
  | 'published'
  | 'publish_failed'

/** Canonical fields retained while a submission is active. */
export interface NormalizedSubmissionFields extends SubmissionFields {
  llmsFullUrl?: string
}

/** Minimal Redis record for an active trusted submission. */
export interface SubmissionRecord {
  readonly branch?: string
  readonly createdAt: string
  readonly expiresAt: string
  readonly fields: NormalizedSubmissionFields
  readonly fieldsHash: string
  readonly headSha?: string
  readonly prNumber?: number
  readonly resultCode?: string
  readonly state: SubmissionState
  readonly submissionId: string
  readonly updatedAt: string
  readonly userId: string
}

interface RedisOperations {
  readonly eval: <T>(
    script: string,
    keys: readonly string[],
    args: readonly string[]
  ) => Promise<T | null>
  readonly get: (key: string) => Promise<unknown>
  readonly setNx: (key: string, value: unknown, ttl: number) => Promise<boolean | null>
}

interface StateDependencies {
  readonly now: () => Date
  readonly redis: RedisOperations
  readonly secret: string
}

const DEFAULT_REDIS: RedisOperations = {
  eval: evalRedis,
  get,
  setNx
}

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value)

const parseSubmissionRecord = (value: unknown): SubmissionRecord | null => {
  if (!isRecord(value) || !isRecord(value.fields)) return null
  if (
    typeof value.submissionId !== 'string' ||
    typeof value.userId !== 'string' ||
    typeof value.fieldsHash !== 'string' ||
    typeof value.expiresAt !== 'string' ||
    typeof value.state !== 'string' ||
    !submissionStateSecurity.isState(value.state)
  ) {
    return null
  }
  const fields = submissionStateSecurity.normalizeFields(value.fields)
  if (!fields || submissionStateSecurity.hashFields(fields) !== value.fieldsHash) return null
  const createdAt = typeof value.createdAt === 'string' ? value.createdAt : ''
  const updatedAt = typeof value.updatedAt === 'string' ? value.updatedAt : ''
  if (
    !createdAt ||
    !updatedAt ||
    !Number.isFinite(Date.parse(createdAt)) ||
    !Number.isFinite(Date.parse(updatedAt)) ||
    !Number.isFinite(Date.parse(value.expiresAt))
  ) {
    return null
  }

  return {
    createdAt,
    expiresAt: value.expiresAt,
    fields,
    fieldsHash: value.fieldsHash,
    state: value.state,
    submissionId: value.submissionId,
    updatedAt,
    userId: value.userId
  }
}

/** Validate and canonicalize all fields stored for an active submission. */
export const normalizeSubmissionFields = submissionStateSecurity.normalizeFields

/** Hash normalized fields using a fixed canonical order. */
export const hashSubmissionFields = submissionStateSecurity.hashFields

/** Determine whether a state transition belongs to the approved state graph. */
export const isAllowedSubmissionTransition = submissionStateSecurity.isAllowedTransition

/**
 * Persist a support-required record and return an opaque HMAC continuation.
 *
 * @param input - Authenticated submission identity and untrusted fields
 * @param dependencies - Clock, Redis operations, and server-only secret
 * @returns Continuation and record, or a fail-closed reason
 */
export async function createSubmissionContinuation(
  input: {
    readonly fields: unknown
    readonly submissionId: string
    readonly userId: string
  },
  dependencies: StateDependencies = {
    now: () => new Date(),
    redis: DEFAULT_REDIS,
    secret: process.env.SUBMISSION_ASSESSMENT_SIGNING_SECRET ?? ''
  }
): Promise<
  | { readonly continuationToken: string; readonly ok: true; readonly record: SubmissionRecord }
  | { readonly code: 'invalid_input' | 'publication_unavailable'; readonly ok: false }
> {
  const fields = normalizeSubmissionFields(input.fields)
  if (
    !fields ||
    !SUBMISSION_ID_PATTERN.test(input.submissionId) ||
    !input.userId ||
    input.userId.length > 256 ||
    !submissionStateSecurity.isSecretValid(dependencies.secret)
  ) {
    return { code: 'invalid_input', ok: false }
  }

  const now = dependencies.now()
  const createdAt = now.toISOString()
  const expiresAt = new Date(now.getTime() + SUBMISSION_RECORD_TTL_SECONDS * 1000).toISOString()
  const fieldsHash = hashSubmissionFields(fields)
  const nonce = randomBytes(24).toString('base64url')
  const signature = submissionStateSecurity
    .continuationSignature(
      input.submissionId,
      nonce,
      input.userId,
      fieldsHash,
      expiresAt,
      dependencies.secret
    )
    .toString('base64url')
  const continuationToken = `${input.submissionId}.${nonce}.${signature}`
  const record: SubmissionRecord = {
    createdAt,
    expiresAt,
    fields,
    fieldsHash,
    state: 'support_required',
    submissionId: input.submissionId,
    updatedAt: createdAt,
    userId: input.userId
  }

  const stored = await dependencies.redis.setNx(
    submissionStateSecurity.recordKey(input.submissionId),
    record,
    SUBMISSION_RECORD_TTL_SECONDS
  )
  if (stored !== true) return { code: 'publication_unavailable', ok: false }
  return { continuationToken, ok: true, record }
}

/**
 * Atomically consume a continuation and enter final assessment exactly once.
 *
 * @param input - Authenticated account, unchanged fields, and opaque continuation
 * @param dependencies - Clock, Redis operations, and server-only secret
 * @returns Consumed submission identity or a stable failure code
 */
export async function consumeSubmissionContinuation(
  input: {
    readonly continuationToken: string
    readonly fields: unknown
    readonly userId: string
  },
  dependencies: StateDependencies = {
    now: () => new Date(),
    redis: DEFAULT_REDIS,
    secret: process.env.SUBMISSION_ASSESSMENT_SIGNING_SECRET ?? ''
  }
): Promise<
  | { readonly ok: true; readonly submissionId: string }
  | {
      readonly code: 'expired' | 'invalid_continuation' | 'publication_unavailable' | 'replayed'
      readonly ok: false
    }
> {
  if (
    input.continuationToken.length === 0 ||
    input.continuationToken.length > MAX_CONTINUATION_CHARACTERS ||
    !submissionStateSecurity.isSecretValid(dependencies.secret)
  ) {
    return { code: 'invalid_continuation', ok: false }
  }
  const parts = input.continuationToken.split('.')
  if (parts.length !== 3) return { code: 'invalid_continuation', ok: false }
  const [submissionId, nonce, signature] = parts
  if (!submissionId || !nonce || !signature || !SUBMISSION_ID_PATTERN.test(submissionId)) {
    return { code: 'invalid_continuation', ok: false }
  }

  const fields = normalizeSubmissionFields(input.fields)
  if (!fields) return { code: 'invalid_continuation', ok: false }
  const record = parseSubmissionRecord(
    await dependencies.redis.get(submissionStateSecurity.recordKey(submissionId))
  )
  if (!record) return { code: 'publication_unavailable', ok: false }
  const fieldsHash = hashSubmissionFields(fields)
  const expected = submissionStateSecurity.continuationSignature(
    submissionId,
    nonce,
    input.userId,
    fieldsHash,
    record.expiresAt,
    dependencies.secret
  )
  if (
    record.userId !== input.userId ||
    record.submissionId !== submissionId ||
    record.fieldsHash !== fieldsHash ||
    !submissionStateSecurity.safeEqual(expected, signature)
  ) {
    return { code: 'invalid_continuation', ok: false }
  }

  const now = dependencies.now()
  if (Date.parse(record.expiresAt) <= now.getTime()) return { code: 'expired', ok: false }
  const result = await dependencies.redis.eval<string>(
    FINAL_ASSESSMENT_SCRIPT,
    [submissionStateSecurity.recordKey(submissionId)],
    [input.userId, fieldsHash, now.toISOString()]
  )
  if (result === 'transitioned') return { ok: true, submissionId }
  if (result === 'state_mismatch') return { code: 'replayed', ok: false }
  if (result === 'expired') return { code: 'expired', ok: false }
  return { code: 'publication_unavailable', ok: false }
}

/**
 * Acquire both normalized URL locks atomically for one submission ID.
 *
 * @param input - Submission ID and submitted URLs
 * @param dependencies - Redis operations
 * @returns Lock acquisition, duplicate conflict, or infrastructure failure
 */
export async function acquireSubmissionLocks(
  input: { readonly llmsUrl: string; readonly submissionId: string; readonly website: string },
  dependencies: Pick<StateDependencies, 'redis'> = { redis: DEFAULT_REDIS }
): Promise<
  | { readonly ok: true }
  | { readonly code: 'duplicate' | 'publication_unavailable'; readonly ok: false }
> {
  const website = validateSubmissionUrl(input.website)
  const llmsUrl = validateSubmissionUrl(input.llmsUrl)
  if (!website.ok || !llmsUrl.ok || !SUBMISSION_ID_PATTERN.test(input.submissionId)) {
    return { code: 'publication_unavailable', ok: false }
  }
  const result = await dependencies.redis.eval<string>(
    ACQUIRE_SUBMISSION_LOCKS_SCRIPT,
    [
      `submission-lock:website:${submissionStateSecurity.hashString(website.normalizedUrl)}`,
      `submission-lock:llms:${submissionStateSecurity.hashString(llmsUrl.normalizedUrl)}`
    ],
    [input.submissionId, String(SUBMISSION_RECORD_TTL_SECONDS)]
  )
  if (result === 'acquired') return { ok: true }
  if (result === 'conflict') return { code: 'duplicate', ok: false }
  return { code: 'publication_unavailable', ok: false }
}

/**
 * Atomically enforce account, source-IP-HMAC, and domain submission limits.
 *
 * @param input - Authenticated account and normalized abuse dimensions
 * @param dependencies - Redis operations and HMAC secret
 * @returns Limit approval, exhausted scope, or infrastructure failure
 */
export async function enforceSubmissionRateLimits(
  input: {
    readonly registrableDomain: string
    readonly sourceIp: string
    readonly userId: string
  },
  dependencies: Pick<StateDependencies, 'redis' | 'secret'> = {
    redis: DEFAULT_REDIS,
    secret: process.env.SUBMISSION_ASSESSMENT_SIGNING_SECRET ?? ''
  }
): Promise<
  | { readonly ok: true }
  | {
      readonly code: 'rate_limited'
      readonly ok: false
      readonly scope: 'account' | 'domain' | 'source_ip'
    }
  | { readonly code: 'publication_unavailable'; readonly ok: false }
> {
  if (
    !input.userId ||
    input.userId.length > 256 ||
    !input.sourceIp ||
    input.sourceIp.length > 128 ||
    !/^[a-z0-9.-]{1,253}$/.test(input.registrableDomain) ||
    !submissionStateSecurity.isSecretValid(dependencies.secret)
  ) {
    return { code: 'publication_unavailable', ok: false }
  }
  const result = await dependencies.redis.eval<string>(
    SUBMISSION_RATE_LIMIT_SCRIPT,
    [
      `submission-rate:account:${submissionStateSecurity.hashString(input.userId)}`,
      `submission-rate:source:${submissionStateSecurity.hashIp(input.sourceIp, dependencies.secret)}`,
      `submission-rate:domain:${submissionStateSecurity.hashString(input.registrableDomain)}`
    ],
    ['5', '20', '3', '3600', '3600', '86400']
  )
  if (result === 'allowed') return { ok: true }
  if (result === 'account' || result === 'source_ip' || result === 'domain') {
    return { code: 'rate_limited', ok: false, scope: result }
  }
  return { code: 'publication_unavailable', ok: false }
}
