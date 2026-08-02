import { createHmac, timingSafeEqual } from 'node:crypto'

import type { AssessmentAttestationPayload } from '#types'
import { validateSubmissionUrl } from '#url-policy'

const ATTESTATION_MARKER = 'llms-hub-assessment'
const BLOCK_PREFIX = '<!-- llms-hub-assessment:v1\n'
const BLOCK_SUFFIX = '\n-->'
const MAX_PR_BODY_CHARACTERS = 100_000
const MAX_ENCODED_PAYLOAD_CHARACTERS = 32_768
const HMAC_BYTES = 32
const MINIMUM_SECRET_BYTES = 32
const MAX_PR_NUMBER = 2_147_483_647
const ISO_INSTANT = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/
const BASE64URL = /^[A-Za-z0-9_-]+$/
const SHA1 = /^[a-f0-9]{40}$/
const SHA256 = /^[a-f0-9]{64}$/
const REPOSITORY = /^[A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+$/
const TOKEN = /^[A-Za-z0-9._-]+$/
const SAFE_PATH = /^[\x20-\x7e]+$/

const PAYLOAD_KEYS = new Set([
  'repository',
  'submissionId',
  'prNumber',
  'headSha',
  'mdxPath',
  'mdxContentSha256',
  'website',
  'llmsUrl',
  'llmsFullUrl',
  'decision',
  'policyVersion',
  'webRiskCheckedAt',
  'issuedAt',
  'expiresAt'
])

/** Stable reason returned when an attestation cannot be created. */
export type AssessmentAttestationCreationFailureCode = 'invalid_payload' | 'secret_too_short'

/** Result of creating an exact-head assessment attestation. */
export type AssessmentAttestationCreationResult =
  | {
      readonly block: string
      readonly ok: true
      readonly payload: AssessmentAttestationPayload
    }
  | {
      readonly code: AssessmentAttestationCreationFailureCode
      readonly ok: false
    }

/** Stable machine-readable verification failures safe to retain in logs. */
export type AssessmentAttestationVerificationFailureCode =
  | 'body_too_large'
  | 'duplicate_block'
  | 'expired'
  | 'head_sha_mismatch'
  | 'invalid_expectation'
  | 'invalid_payload'
  | 'invalid_signature'
  | 'llms_full_url_mismatch'
  | 'llms_url_mismatch'
  | 'malformed_block'
  | 'mdx_content_hash_mismatch'
  | 'mdx_path_mismatch'
  | 'missing_block'
  | 'not_yet_valid'
  | 'policy_version_mismatch'
  | 'pr_number_mismatch'
  | 'repository_mismatch'
  | 'secret_too_short'
  | 'submission_id_mismatch'
  | 'web_risk_checked_at_mismatch'
  | 'website_mismatch'

/** Caller-known facts that must match every signed publication binding. */
export interface AssessmentAttestationExpectation {
  readonly headSha: string
  readonly llmsFullUrl?: string
  readonly llmsUrl: string
  readonly mdxContentSha256: string
  readonly mdxPath: string
  readonly policyVersion: string
  readonly prNumber: number
  readonly repository: string
  readonly submissionId: string
  readonly webRiskCheckedAt: string
  readonly website: string
}

/** Inputs required to verify one PR-body attestation. */
export interface AssessmentAttestationVerificationInput {
  readonly body: string
  readonly expected: AssessmentAttestationExpectation
  readonly now?: () => Date
  readonly secret: string
}

/** Result of verifying a signed assessment attestation. */
export type AssessmentAttestationVerificationResult =
  | {
      readonly ok: true
      readonly payload: AssessmentAttestationPayload
    }
  | {
      readonly code: AssessmentAttestationVerificationFailureCode
      readonly ok: false
    }

type PayloadRecord = Record<string, unknown>

interface ParsedBlock {
  readonly encodedPayload: string
  readonly signature: string
}

interface SignatureVerification {
  readonly canonical: boolean
  readonly matches: boolean
}

const isRecord = (value: unknown): value is PayloadRecord =>
  typeof value === 'object' && value !== null && !Array.isArray(value)

const isCanonicalInstant = (value: unknown): value is string => {
  if (typeof value !== 'string' || !ISO_INSTANT.test(value)) return false
  const time = Date.parse(value)
  return Number.isFinite(time) && new Date(time).toISOString() === value
}

const normalizeUrl = (value: unknown): string | null => {
  if (typeof value !== 'string' || value.length > 4096) return null
  const result = validateSubmissionUrl(value)
  return result.ok ? result.normalizedUrl : null
}

const isSafeRelativePath = (value: unknown): value is string => {
  if (
    typeof value !== 'string' ||
    value.length === 0 ||
    value.length > 1024 ||
    !SAFE_PATH.test(value) ||
    value.startsWith('/') ||
    value.includes('\\')
  ) {
    return false
  }
  const segments = value.split('/')
  return segments.every(segment => segment.length > 0 && segment !== '.' && segment !== '..')
}

const normalizePayload = (value: unknown): AssessmentAttestationPayload | null => {
  if (!isRecord(value)) return null
  const record = value
  const keys = Object.keys(record)
  const expectedKeyCount = Object.hasOwn(record, 'llmsFullUrl') ? 14 : 13
  if (keys.length !== expectedKeyCount || !keys.every(key => PAYLOAD_KEYS.has(key))) return null
  if (
    typeof record.repository !== 'string' ||
    !REPOSITORY.test(record.repository) ||
    record.repository.length > 200
  ) {
    return null
  }
  if (
    typeof record.submissionId !== 'string' ||
    record.submissionId.length === 0 ||
    record.submissionId.length > 128 ||
    !TOKEN.test(record.submissionId)
  ) {
    return null
  }
  if (
    typeof record.prNumber !== 'number' ||
    !Number.isSafeInteger(record.prNumber) ||
    record.prNumber < 1 ||
    record.prNumber > MAX_PR_NUMBER
  ) {
    return null
  }
  if (typeof record.headSha !== 'string' || !SHA1.test(record.headSha)) return null
  if (!isSafeRelativePath(record.mdxPath)) return null
  if (typeof record.mdxContentSha256 !== 'string' || !SHA256.test(record.mdxContentSha256)) {
    return null
  }
  const website = normalizeUrl(record.website)
  const llmsUrl = normalizeUrl(record.llmsUrl)
  const llmsFullUrl =
    record.llmsFullUrl === undefined ? undefined : normalizeUrl(record.llmsFullUrl)
  if (!website || !llmsUrl || llmsFullUrl === null) return null
  if (record.decision !== 'auto_publish') return null
  if (
    typeof record.policyVersion !== 'string' ||
    record.policyVersion.length === 0 ||
    record.policyVersion.length > 128 ||
    !TOKEN.test(record.policyVersion)
  ) {
    return null
  }
  if (
    !isCanonicalInstant(record.webRiskCheckedAt) ||
    !isCanonicalInstant(record.issuedAt) ||
    !isCanonicalInstant(record.expiresAt) ||
    Date.parse(record.webRiskCheckedAt) > Date.parse(record.issuedAt) ||
    Date.parse(record.expiresAt) <= Date.parse(record.issuedAt)
  ) {
    return null
  }

  const normalizedBase = {
    repository: record.repository,
    submissionId: record.submissionId,
    prNumber: record.prNumber,
    headSha: record.headSha,
    mdxPath: record.mdxPath,
    mdxContentSha256: record.mdxContentSha256,
    website,
    llmsUrl,
    decision: 'auto_publish',
    policyVersion: record.policyVersion,
    webRiskCheckedAt: record.webRiskCheckedAt,
    issuedAt: record.issuedAt,
    expiresAt: record.expiresAt
  } satisfies AssessmentAttestationPayload

  return llmsFullUrl === undefined ? normalizedBase : { ...normalizedBase, llmsFullUrl }
}

const canonicalPayload = (payload: AssessmentAttestationPayload): string => {
  const fields: [string, string][] = [
    ['repository', JSON.stringify(payload.repository)],
    ['submissionId', JSON.stringify(payload.submissionId)],
    ['prNumber', JSON.stringify(payload.prNumber)],
    ['headSha', JSON.stringify(payload.headSha)],
    ['mdxPath', JSON.stringify(payload.mdxPath)],
    ['mdxContentSha256', JSON.stringify(payload.mdxContentSha256)],
    ['website', JSON.stringify(payload.website)],
    ['llmsUrl', JSON.stringify(payload.llmsUrl)]
  ]
  if (payload.llmsFullUrl !== undefined) {
    fields.push(['llmsFullUrl', JSON.stringify(payload.llmsFullUrl)])
  }
  fields.push(
    ['decision', JSON.stringify(payload.decision)],
    ['policyVersion', JSON.stringify(payload.policyVersion)],
    ['webRiskCheckedAt', JSON.stringify(payload.webRiskCheckedAt)],
    ['issuedAt', JSON.stringify(payload.issuedAt)],
    ['expiresAt', JSON.stringify(payload.expiresAt)]
  )
  return `{${fields.map(([key, serialized]) => `${JSON.stringify(key)}:${serialized}`).join(',')}}`
}

const parseBlock = (body: string): ParsedBlock | AssessmentAttestationVerificationFailureCode => {
  if (body.length > MAX_PR_BODY_CHARACTERS) return 'body_too_large'
  const markerCount = body.toLowerCase().split(ATTESTATION_MARKER).length - 1
  if (markerCount === 0) return 'missing_block'
  if (markerCount > 1) return 'duplicate_block'

  const prefixIndex = body.indexOf(BLOCK_PREFIX)
  if (prefixIndex === -1) return 'malformed_block'
  const payloadStart = prefixIndex + BLOCK_PREFIX.length
  const payloadEnd = body.indexOf('\n', payloadStart)
  if (payloadEnd === -1) return 'malformed_block'
  const signatureEnd = body.indexOf(BLOCK_SUFFIX, payloadEnd + 1)
  if (signatureEnd === -1) return 'malformed_block'
  const encodedPayload = body.slice(payloadStart, payloadEnd)
  const signature = body.slice(payloadEnd + 1, signatureEnd)
  if (
    encodedPayload.length === 0 ||
    encodedPayload.length > MAX_ENCODED_PAYLOAD_CHARACTERS ||
    !BASE64URL.test(encodedPayload) ||
    signature.length !== 43 ||
    !BASE64URL.test(signature)
  ) {
    return 'malformed_block'
  }
  return { encodedPayload, signature }
}

const decodeCanonicalBase64Url = (encoded: string): Buffer | null => {
  const decoded = Buffer.from(encoded, 'base64url')
  return decoded.toString('base64url') === encoded ? decoded : null
}

const verifySignature = (
  payload: Buffer,
  encodedSignature: string,
  secret: string
): SignatureVerification => {
  const supplied = decodeCanonicalBase64Url(encodedSignature)
  const comparable = Buffer.alloc(HMAC_BYTES)
  if (supplied) supplied.copy(comparable, 0, 0, HMAC_BYTES)
  const expected = createHmac('sha256', secret).update(payload).digest()
  const matches = timingSafeEqual(expected, comparable)
  const canonical = supplied?.byteLength === HMAC_BYTES
  return { canonical, matches: matches && canonical }
}

const parseCanonicalPayload = (encoded: string): AssessmentAttestationPayload | null => {
  const bytes = decodeCanonicalBase64Url(encoded)
  if (!bytes) return null
  let serialized: string
  try {
    serialized = new TextDecoder('utf-8', { fatal: true }).decode(bytes)
  } catch {
    return null
  }
  let parsed: unknown
  try {
    parsed = JSON.parse(serialized)
  } catch {
    return null
  }
  const normalized = normalizePayload(parsed)
  if (!normalized || canonicalPayload(normalized) !== serialized) return null
  return normalized
}

const normalizeExpectation = (
  expected: AssessmentAttestationExpectation
): AssessmentAttestationExpectation | null => {
  const website = normalizeUrl(expected.website)
  const llmsUrl = normalizeUrl(expected.llmsUrl)
  const llmsFullUrl =
    expected.llmsFullUrl === undefined ? undefined : normalizeUrl(expected.llmsFullUrl)
  if (
    typeof expected.repository !== 'string' ||
    typeof expected.submissionId !== 'string' ||
    typeof expected.prNumber !== 'number' ||
    typeof expected.headSha !== 'string' ||
    typeof expected.mdxPath !== 'string' ||
    typeof expected.mdxContentSha256 !== 'string' ||
    typeof expected.policyVersion !== 'string' ||
    typeof expected.webRiskCheckedAt !== 'string' ||
    !REPOSITORY.test(expected.repository) ||
    expected.repository.length > 200 ||
    expected.submissionId.length === 0 ||
    expected.submissionId.length > 128 ||
    !TOKEN.test(expected.submissionId) ||
    !Number.isSafeInteger(expected.prNumber) ||
    expected.prNumber < 1 ||
    expected.prNumber > MAX_PR_NUMBER ||
    !SHA1.test(expected.headSha) ||
    !isSafeRelativePath(expected.mdxPath) ||
    !SHA256.test(expected.mdxContentSha256) ||
    !website ||
    !llmsUrl ||
    llmsFullUrl === null ||
    expected.policyVersion.length === 0 ||
    expected.policyVersion.length > 128 ||
    !TOKEN.test(expected.policyVersion) ||
    !isCanonicalInstant(expected.webRiskCheckedAt)
  ) {
    return null
  }
  const normalized = { ...expected, website, llmsUrl }
  return llmsFullUrl === undefined
    ? { ...normalized, llmsFullUrl: undefined }
    : { ...normalized, llmsFullUrl }
}

const bindingMismatch = (
  payload: AssessmentAttestationPayload,
  expected: AssessmentAttestationExpectation
): AssessmentAttestationVerificationFailureCode | null => {
  if (payload.repository !== expected.repository) return 'repository_mismatch'
  if (payload.submissionId !== expected.submissionId) return 'submission_id_mismatch'
  if (payload.prNumber !== expected.prNumber) return 'pr_number_mismatch'
  if (payload.headSha !== expected.headSha) return 'head_sha_mismatch'
  if (payload.mdxPath !== expected.mdxPath) return 'mdx_path_mismatch'
  if (payload.mdxContentSha256 !== expected.mdxContentSha256) {
    return 'mdx_content_hash_mismatch'
  }
  if (payload.website !== expected.website) return 'website_mismatch'
  if (payload.llmsUrl !== expected.llmsUrl) return 'llms_url_mismatch'
  if (payload.llmsFullUrl !== expected.llmsFullUrl) return 'llms_full_url_mismatch'
  if (payload.policyVersion !== expected.policyVersion) return 'policy_version_mismatch'
  if (payload.webRiskCheckedAt !== expected.webRiskCheckedAt) {
    return 'web_risk_checked_at_mismatch'
  }
  return null
}

/**
 * Creates a canonical HMAC-SHA256 PR-body attestation block.
 *
 * @param payload - Exact automatic-publication facts to bind.
 * @param secret - Server-only signing secret containing at least 32 UTF-8 bytes.
 * @returns A signed block or a safe stable failure.
 */
export const createAssessmentAttestation = (
  payload: AssessmentAttestationPayload,
  secret: string
): AssessmentAttestationCreationResult => {
  if (Buffer.byteLength(secret, 'utf8') < MINIMUM_SECRET_BYTES) {
    return { code: 'secret_too_short', ok: false }
  }
  const normalized = normalizePayload(payload)
  if (!normalized) return { code: 'invalid_payload', ok: false }
  const serialized = canonicalPayload(normalized)
  const encodedPayload = Buffer.from(serialized).toString('base64url')
  const signature = createHmac('sha256', secret).update(serialized).digest('base64url')
  return {
    block: `${BLOCK_PREFIX}${encodedPayload}\n${signature}${BLOCK_SUFFIX}`,
    ok: true,
    payload: normalized
  }
}

/**
 * Verifies one canonical attestation and every caller-known publication binding.
 *
 * @param input - PR body, exact expected facts, clock, and server-only secret.
 * @returns The verified normalized payload or a safe stable failure code.
 */
export const verifyAssessmentAttestation = (
  input: AssessmentAttestationVerificationInput
): AssessmentAttestationVerificationResult => {
  if (Buffer.byteLength(input.secret, 'utf8') < MINIMUM_SECRET_BYTES) {
    return { code: 'secret_too_short', ok: false }
  }
  const block = parseBlock(input.body)
  if (typeof block === 'string') return { code: block, ok: false }
  const payloadBytes = decodeCanonicalBase64Url(block.encodedPayload)
  if (!payloadBytes) return { code: 'malformed_block', ok: false }
  const signature = verifySignature(payloadBytes, block.signature, input.secret)
  if (!signature.canonical) return { code: 'malformed_block', ok: false }
  if (!signature.matches) {
    return { code: 'invalid_signature', ok: false }
  }
  const payload = parseCanonicalPayload(block.encodedPayload)
  if (!payload) return { code: 'invalid_payload', ok: false }
  const expected = normalizeExpectation(input.expected)
  if (!expected) return { code: 'invalid_expectation', ok: false }
  const mismatch = bindingMismatch(payload, expected)
  if (mismatch) return { code: mismatch, ok: false }
  const nowMs = input.now?.().getTime() ?? Date.now()
  if (!Number.isFinite(nowMs)) return { code: 'invalid_expectation', ok: false }
  if (nowMs < Date.parse(payload.issuedAt)) return { code: 'not_yet_valid', ok: false }
  if (nowMs >= Date.parse(payload.expiresAt)) return { code: 'expired', ok: false }
  return { ok: true, payload }
}
