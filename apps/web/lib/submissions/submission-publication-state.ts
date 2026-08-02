import { evalRedis } from '@/lib/redis'

const RECORD_TTL_GUARD_SCRIPT = `
local raw = redis.call('GET', KEYS[1])
if not raw then return 'missing' end
local record = cjson.decode(raw)
local ttl = redis.call('PTTL', KEYS[1])
if ttl <= 0 then return 'expired' end
if ARGV[1] == 'branch' then
  if record.state == 'final_assessing' then
    if ARGV[3] == 'automatic' then
      record.state = 'auto_publish_pending'
    else
      record.state = 'manual_review'
    end
  elseif record.state ~= 'auto_publish_pending' and record.state ~= 'publishing' and record.state ~= 'manual_review' and record.state ~= 'published' then
    return 'state_mismatch'
  end
  if record.branch and record.branch ~= ARGV[2] then return 'binding_mismatch' end
  if record.resultCode and record.resultCode ~= ARGV[4] then return 'binding_mismatch' end
  record.branch = ARGV[2]
  record.resultCode = ARGV[4]
elseif ARGV[1] == 'github' then
  if record.state == 'auto_publish_pending' then record.state = 'publishing'
  elseif record.state ~= 'publishing' and record.state ~= 'manual_review' and record.state ~= 'published' then return 'state_mismatch' end
  if record.branch ~= ARGV[2] then return 'binding_mismatch' end
  if record.prNumber and tostring(record.prNumber) ~= ARGV[3] then return 'binding_mismatch' end
  if record.headSha and record.headSha ~= ARGV[4] then return 'binding_mismatch' end
  record.prNumber = tonumber(ARGV[3])
  record.headSha = ARGV[4]
elseif ARGV[1] == 'complete' then
  if record.state == 'publishing' then record.state = 'published'
  elseif record.state ~= 'manual_review' and record.state ~= 'published' then return 'state_mismatch' end
else return 'invalid_stage' end
record.updatedAt = ARGV[5]
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

const update = async (submissionId: string, args: readonly string[]): Promise<boolean> => {
  if (!ID.test(submissionId)) return false
  return (
    (await evalRedis<string>(RECORD_TTL_GUARD_SCRIPT, [`submission:${submissionId}`], args)) ===
    'updated'
  )
}

/** Durable publication-state operations consumed by the GitHub publisher. */
export interface SubmissionPublicationState {
  readonly markComplete: (submissionId: string) => Promise<boolean>
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
  markComplete(submissionId) {
    return update(submissionId, ['complete', '', '', '', new Date().toISOString()])
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
