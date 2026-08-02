import type { SubmissionReasonCode } from '@thedaviddias/submission-trust/types'

import { evalRedis } from '@/lib/redis'
import { normalizeSubmissionFields } from './submission-state'
import { submissionStateSecurity } from './submission-state-security'

const RECORD_TTL_GUARD_SCRIPT = `
local raw = redis.call('GET', KEYS[1])
if not raw then return 'missing' end
local record = cjson.decode(raw)
local ttl = redis.call('PTTL', KEYS[1])
if ttl <= 0 then return 'expired' end
if ARGV[1] == 'branch' then
  local entering = record.state == 'final_assessing'
  if entering then
    if ARGV[3] == 'automatic' then
      record.state = 'auto_publish_pending'
    else
      record.state = 'manual_review'
    end
  elseif record.state ~= 'auto_publish_pending' and record.state ~= 'publishing' and record.state ~= 'manual_review' then
    return 'state_mismatch'
  end
  if record.branch and record.branch ~= ARGV[2] then return 'binding_mismatch' end
  if not entering and record.resultCode and record.resultCode ~= ARGV[4] then return 'binding_mismatch' end
  record.branch = ARGV[2]
  record.resultCode = ARGV[4]
elseif ARGV[1] == 'github' then
  if record.state == 'auto_publish_pending' or record.state == 'manual_review' then
    record.state = 'publishing'
  elseif record.state ~= 'publishing' then
    return 'state_mismatch'
  end
  if record.branch ~= ARGV[2] then return 'binding_mismatch' end
  if record.prNumber and tostring(record.prNumber) ~= ARGV[3] then return 'binding_mismatch' end
  if record.headSha and record.headSha ~= ARGV[4] then return 'binding_mismatch' end
  record.prNumber = tonumber(ARGV[3])
  record.headSha = ARGV[4]
elseif ARGV[1] == 'failed' then
  if record.state == 'auto_publish_pending' or record.state == 'manual_review' or record.state == 'publishing' then
    record.state = 'publish_failed'
  elseif record.state ~= 'publish_failed' then
    return 'state_mismatch'
  end
  record.resultCode = 'publication_unavailable'
else return 'invalid_stage' end
record.updatedAt = ARGV[5]
redis.call('SET', KEYS[1], cjson.encode(record), 'PX', ttl)
return 'updated'
`.trim()

const FINAL_OUTCOME_SCRIPT = `
local raw = redis.call('GET', KEYS[1])
if not raw then return 'missing' end
local record = cjson.decode(raw)
if record.submissionId ~= ARGV[1] or record.state ~= 'final_assessing' then return 'state_mismatch' end
if ARGV[2] ~= 'rejected' and ARGV[2] ~= 'retry_later' then return 'invalid_outcome' end
local ttl = redis.call('PTTL', KEYS[1])
if ttl <= 0 then return 'expired' end
record.state = ARGV[2]
record.resultCode = ARGV[3]
record.updatedAt = ARGV[4]
local website = redis.call('GET', KEYS[2])
if website == ARGV[1] then redis.call('DEL', KEYS[2]) end
local llms = redis.call('GET', KEYS[3])
if llms == ARGV[1] then redis.call('DEL', KEYS[3]) end
redis.call('SET', KEYS[1], cjson.encode(record), 'PX', ttl)
return 'updated'
`.trim()

const ID = /^[A-Za-z0-9_-]{1,128}$/
const BRANCH = /^submit\/[A-Za-z0-9_-]{1,128}$/
const SHA1 = /^[a-f0-9]{40}$/
const RESULT_CODES = new Set([
  'auto_publish',
  'disabled_auto_publish',
  'manual_review',
  'would_auto_publish'
])
const REJECTED_REASONS = new Set<SubmissionReasonCode>([
  'duplicate',
  'invalid_optional_resource',
  'prohibited_content',
  'reputation_match',
  'required_resource_missing',
  'unrelated_site_family',
  'unsafe_network_target'
])
const RETRY_REASONS = new Set<SubmissionReasonCode>([
  'publication_unavailable',
  'rate_limited',
  'reputation_unknown',
  'required_resource_transient_failure'
])

const update = async (submissionId: string, args: readonly string[]): Promise<boolean> => {
  if (!ID.test(submissionId)) return false
  return (
    (await evalRedis<string>(RECORD_TTL_GUARD_SCRIPT, [`submission:${submissionId}`], args)) ===
    'updated'
  )
}

/** Durable publication-state operations consumed by the GitHub publisher. */
export interface SubmissionPublicationState {
  readonly markFailed: (submissionId: string) => Promise<boolean>
  readonly persistBranch: (input: {
    readonly branch: string
    readonly outcome: 'automatic' | 'manual'
    readonly resultCode: string
    readonly submissionId: string
  }) => Promise<boolean>
  readonly persistGithub: (input: {
    readonly branch: string
    readonly headSha: string
    readonly prNumber: number
    readonly submissionId: string
  }) => Promise<boolean>
}

/** Production Redis-backed publication metadata adapter. */
export const submissionPublicationState: SubmissionPublicationState = {
  markFailed(submissionId) {
    return update(submissionId, [
      'failed',
      '',
      '',
      'publication_unavailable',
      new Date().toISOString()
    ])
  },
  persistBranch(input) {
    if (
      !BRANCH.test(input.branch) ||
      !RESULT_CODES.has(input.resultCode) ||
      (input.outcome !== 'automatic' && input.outcome !== 'manual') ||
      (input.outcome === 'automatic' && input.resultCode !== 'auto_publish') ||
      (input.outcome === 'manual' && input.resultCode === 'auto_publish')
    ) {
      return Promise.resolve(false)
    }
    return update(input.submissionId, [
      'branch',
      input.branch,
      input.outcome,
      input.resultCode,
      new Date().toISOString()
    ])
  },
  persistGithub(input) {
    if (
      !BRANCH.test(input.branch) ||
      !SHA1.test(input.headSha) ||
      !Number.isSafeInteger(input.prNumber) ||
      input.prNumber < 1
    ) {
      return Promise.resolve(false)
    }
    return update(input.submissionId, [
      'github',
      input.branch,
      String(input.prNumber),
      input.headSha,
      new Date().toISOString()
    ])
  }
}

/**
 * Atomically finish final assessment and release only URL locks owned by it.
 *
 * @param input - Bound fields, stable outcome, reason, and submission identity
 * @returns Whether Redis committed the transition and owned-lock cleanup
 */
export async function recordFinalSubmissionOutcome(input: {
  readonly fields: unknown
  readonly outcome: 'rejected' | 'retry_later'
  readonly reasonCode: SubmissionReasonCode
  readonly submissionId: string
}): Promise<boolean> {
  const fields = normalizeSubmissionFields(input.fields)
  const reasons = input.outcome === 'rejected' ? REJECTED_REASONS : RETRY_REASONS
  if (!fields || !ID.test(input.submissionId) || !reasons.has(input.reasonCode)) return false
  const result = await evalRedis<string>(
    FINAL_OUTCOME_SCRIPT,
    [
      `submission:${input.submissionId}`,
      `submission-lock:website:${submissionStateSecurity.hashString(fields.website)}`,
      `submission-lock:llms:${submissionStateSecurity.hashString(fields.llmsUrl)}`
    ],
    [input.submissionId, input.outcome, input.reasonCode, new Date().toISOString()]
  )
  return result === 'updated'
}
