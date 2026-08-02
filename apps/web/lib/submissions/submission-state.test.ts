import {
  acquireSubmissionLocks,
  consumeSubmissionContinuation,
  createSubmissionContinuation,
  enforceSubmissionRateLimits,
  hashSubmissionFields,
  isAllowedSubmissionTransition,
  normalizeSubmissionFields
} from './submission-state'

const SECRET = 's'.repeat(32)
const NOW = new Date('2026-08-01T12:00:00.000Z')
const FIELDS = {
  category: 'developer-tools',
  description: 'A useful directory entry.',
  llmsFullUrl: 'https://example.com/llms-full.txt#ignored',
  llmsUrl: 'https://example.com/llms.txt#ignored',
  name: ' Example ',
  publishedAt: '2026-08-01',
  website: 'https://example.com/#ignored'
}

const makeRedis = () => ({
  eval: jest.fn(),
  get: jest.fn(),
  setNx: jest.fn()
})

describe('submission state', () => {
  it.each([
    ['draft', 'preflight_rejected'],
    ['draft', 'support_required'],
    ['support_required', 'final_assessing'],
    ['final_assessing', 'rejected'],
    ['final_assessing', 'retry_later'],
    ['final_assessing', 'manual_review'],
    ['final_assessing', 'auto_publish_pending'],
    ['auto_publish_pending', 'publishing'],
    ['publishing', 'published'],
    ['publishing', 'publish_failed']
  ])('allows %s -> %s', (from, to) => {
    expect(isAllowedSubmissionTransition(from, to)).toBe(true)
  })

  it.each([
    ['draft', 'publishing'],
    ['support_required', 'published'],
    ['final_assessing', 'support_required'],
    ['auto_publish_pending', 'published'],
    ['auto_publish_pending', 'publish_failed'],
    ['manual_review', 'publishing'],
    ['published', 'draft'],
    ['publish_failed', 'publishing']
  ])('rejects %s -> %s', (from, to) => {
    expect(isAllowedSubmissionTransition(from, to)).toBe(false)
  })

  it('normalizes fields and stores a 48-hour support record', async () => {
    const redis = makeRedis()
    redis.setNx.mockResolvedValue(true)

    const result = await createSubmissionContinuation(
      {
        fields: FIELDS,
        submissionId: 'sub_123',
        userId: 'user_123'
      },
      { now: () => NOW, redis, secret: SECRET }
    )

    expect(result.ok).toBe(true)
    if (!result.ok) return
    expect(result.continuationToken).not.toContain('user_123')
    expect(result.continuationToken).not.toContain('example.com')
    expect(result.record.fields).toEqual({
      ...FIELDS,
      llmsFullUrl: 'https://example.com/llms-full.txt',
      llmsUrl: 'https://example.com/llms.txt',
      name: 'Example',
      website: 'https://example.com/'
    })
    expect(redis.setNx).toHaveBeenCalledWith('submission:sub_123', result.record, 48 * 60 * 60)
  })

  it('atomically consumes a valid support continuation exactly once', async () => {
    const redis = makeRedis()
    redis.setNx.mockResolvedValue(true)
    redis.eval.mockResolvedValueOnce('transitioned').mockResolvedValueOnce('state_mismatch')
    const created = await createSubmissionContinuation(
      { fields: FIELDS, submissionId: 'sub_123', userId: 'user_123' },
      { now: () => NOW, redis, secret: SECRET }
    )
    expect(created.ok).toBe(true)
    if (!created.ok) return
    redis.get.mockResolvedValue(created.record)

    const input = {
      continuationToken: created.continuationToken,
      fields: FIELDS,
      userId: 'user_123'
    }
    await expect(
      consumeSubmissionContinuation(input, { now: () => NOW, redis, secret: SECRET })
    ).resolves.toEqual({ ok: true, submissionId: 'sub_123' })
    await expect(
      consumeSubmissionContinuation(input, { now: () => NOW, redis, secret: SECRET })
    ).resolves.toEqual({ code: 'replayed', ok: false })
    expect(redis.eval).toHaveBeenCalledTimes(2)
    expect(redis.eval.mock.calls[0]?.[0]).toContain('support_required')
    expect(redis.eval.mock.calls[0]?.[0]).toContain('final_assessing')
  })

  it.each([
    [
      'changed fields',
      { fields: { ...FIELDS, name: 'Changed' }, tokenSuffix: '', userId: 'user_123' }
    ],
    ['changed account', { fields: FIELDS, tokenSuffix: '', userId: 'user_other' }],
    ['tampered token', { fields: FIELDS, tokenSuffix: 'x', userId: 'user_123' }]
  ])('rejects %s before running the transition script', async (_label, change) => {
    const redis = makeRedis()
    redis.setNx.mockResolvedValue(true)
    const created = await createSubmissionContinuation(
      { fields: FIELDS, submissionId: 'sub_123', userId: 'user_123' },
      { now: () => NOW, redis, secret: SECRET }
    )
    expect(created.ok).toBe(true)
    if (!created.ok) return
    redis.get.mockResolvedValue(created.record)

    const token = `${created.continuationToken}${change.tokenSuffix}`
    const result = await consumeSubmissionContinuation(
      {
        continuationToken: token,
        fields: change.fields,
        userId: change.userId
      },
      { now: () => NOW, redis, secret: SECRET }
    )

    expect(result).toEqual({ code: 'invalid_continuation', ok: false })
    expect(redis.eval).not.toHaveBeenCalled()
  })

  it('rejects an expired continuation before transition', async () => {
    const redis = makeRedis()
    redis.setNx.mockResolvedValue(true)
    const created = await createSubmissionContinuation(
      { fields: FIELDS, submissionId: 'sub_123', userId: 'user_123' },
      { now: () => NOW, redis, secret: SECRET }
    )
    expect(created.ok).toBe(true)
    if (!created.ok) return
    redis.get.mockResolvedValue(created.record)

    const result = await consumeSubmissionContinuation(
      {
        continuationToken: created.continuationToken,
        fields: FIELDS,
        userId: 'user_123'
      },
      {
        now: () => new Date(NOW.getTime() + 48 * 60 * 60 * 1000 + 1),
        redis,
        secret: SECRET
      }
    )

    expect(result).toEqual({ code: 'expired', ok: false })
    expect(redis.eval).not.toHaveBeenCalled()
  })

  it('preserves the physical Redis TTL atomically when final assessment starts later', async () => {
    const redis = makeRedis()
    redis.setNx.mockResolvedValue(true)
    redis.eval.mockResolvedValue('transitioned')
    const created = await createSubmissionContinuation(
      { fields: FIELDS, submissionId: 'sub_123', userId: 'user_123' },
      { now: () => NOW, redis, secret: SECRET }
    )
    expect(created.ok).toBe(true)
    if (!created.ok) return
    redis.get.mockResolvedValue(created.record)

    await consumeSubmissionContinuation(
      {
        continuationToken: created.continuationToken,
        fields: FIELDS,
        userId: 'user_123'
      },
      {
        now: () => new Date(NOW.getTime() + 60 * 60 * 1000),
        redis,
        secret: SECRET
      }
    )

    expect(redis.eval.mock.calls[0]?.[0]).toContain("redis.call('PTTL', KEYS[1])")
    expect(redis.eval.mock.calls[0]?.[0]).toContain("'PX', ttl")
    expect(redis.eval.mock.calls[0]?.[2]).toEqual([
      'user_123',
      created.record.fieldsHash,
      new Date(NOW.getTime() + 60 * 60 * 1000).toISOString()
    ])
  })

  it('fails closed when Redis cannot create or consume state', async () => {
    const redis = makeRedis()
    redis.setNx.mockResolvedValue(null)

    await expect(
      createSubmissionContinuation(
        { fields: FIELDS, submissionId: 'sub_123', userId: 'user_123' },
        { now: () => NOW, redis, secret: SECRET }
      )
    ).resolves.toEqual({ code: 'publication_unavailable', ok: false })
  })

  it('acquires website and llms locks together and reconciles the same submission', async () => {
    const redis = makeRedis()
    redis.eval.mockResolvedValue('acquired')

    const result = await acquireSubmissionLocks(
      {
        llmsUrl: FIELDS.llmsUrl,
        submissionId: 'sub_123',
        website: FIELDS.website
      },
      { redis }
    )

    expect(result).toEqual({ ok: true })
    const invocation = JSON.stringify(redis.eval.mock.calls[0])
    expect(invocation).not.toContain('example.com')
    expect(invocation).toContain('sub_123')
  })

  it('reports lock conflict and Redis unavailability without a memory fallback', async () => {
    const redis = makeRedis()
    redis.eval.mockResolvedValueOnce('conflict').mockResolvedValueOnce(null)
    const input = {
      llmsUrl: FIELDS.llmsUrl,
      submissionId: 'sub_123',
      website: FIELDS.website
    }

    await expect(acquireSubmissionLocks(input, { redis })).resolves.toEqual({
      code: 'duplicate',
      ok: false
    })
    await expect(acquireSubmissionLocks(input, { redis })).resolves.toEqual({
      code: 'publication_unavailable',
      ok: false
    })
  })

  it('hashes source IPs with HMAC and never sends the raw IP to Redis', async () => {
    const redis = makeRedis()
    redis.eval.mockResolvedValue('allowed')
    const sourceIp = '203.0.113.24'

    const result = await enforceSubmissionRateLimits(
      {
        sourceIp,
        userId: 'user_123',
        website: 'https://www.example.com/docs'
      },
      { redis, secret: SECRET }
    )

    expect(result).toEqual({ ok: true })
    const invocation = JSON.stringify(redis.eval.mock.calls[0])
    expect(invocation).not.toContain(sourceIp)
    expect(invocation).toContain('5')
    expect(invocation).toContain('20')
    expect(invocation).toContain('3')
  })

  it.each([
    ['account', 'account'],
    ['source IP', 'source_ip'],
    ['registrable domain', 'domain']
  ])('returns a stable rate limit result for %s exhaustion', async (_label, redisResult) => {
    const redis = makeRedis()
    redis.eval.mockResolvedValue(redisResult)

    await expect(
      enforceSubmissionRateLimits(
        {
          sourceIp: '203.0.113.24',
          userId: 'user_123',
          website: 'https://example.com'
        },
        { redis, secret: SECRET }
      )
    ).resolves.toEqual({ code: 'rate_limited', ok: false, scope: redisResult })
  })

  it('fails rate limiting closed when Redis is unavailable', async () => {
    const redis = makeRedis()
    redis.eval.mockResolvedValue(null)

    await expect(
      enforceSubmissionRateLimits(
        {
          sourceIp: '203.0.113.24',
          userId: 'user_123',
          website: 'https://example.com'
        },
        { redis, secret: SECRET }
      )
    ).resolves.toEqual({ code: 'publication_unavailable', ok: false })
  })

  it('rejects invalid URL fields during normalization', () => {
    expect(normalizeSubmissionFields({ ...FIELDS, website: 'http://example.com' })).toBeNull()
  })

  it('canonicalizes empty and null llms-full values to absence', () => {
    const absent = normalizeSubmissionFields({ ...FIELDS, llmsFullUrl: undefined })
    const empty = normalizeSubmissionFields({ ...FIELDS, llmsFullUrl: '' })
    const nullValue = normalizeSubmissionFields({ ...FIELDS, llmsFullUrl: null })
    expect(empty).toEqual(absent)
    expect(nullValue).toEqual(absent)
    if (absent && empty && nullValue) {
      expect(hashSubmissionFields(empty)).toBe(hashSubmissionFields(absent))
      expect(hashSubmissionFields(nullValue)).toBe(hashSubmissionFields(absent))
    }
    expect(normalizeSubmissionFields({ ...FIELDS, llmsFullUrl: 42 })).toBeNull()
  })

  it('canonicalizes equivalent IPv6 addresses before deriving the source key', async () => {
    const redis = makeRedis()
    redis.eval.mockResolvedValue('allowed')
    const base = { userId: 'user_123', website: 'https://example.com' }
    await enforceSubmissionRateLimits(
      { ...base, sourceIp: '2001:db8::1' },
      { redis, secret: SECRET }
    )
    await enforceSubmissionRateLimits(
      { ...base, sourceIp: '2001:0db8:0:0:0:0:0:1' },
      { redis, secret: SECRET }
    )
    expect(redis.eval.mock.calls[0]?.[1]?.[1]).toBe(redis.eval.mock.calls[1]?.[1]?.[1])
  })

  it.each(['203.0.113.1, 198.51.100.1', 'not-an-ip'])(
    'rejects malformed source IP %s',
    async sourceIp => {
      const redis = makeRedis()
      await expect(
        enforceSubmissionRateLimits(
          { sourceIp, userId: 'user_123', website: 'https://example.com' },
          { redis, secret: SECRET }
        )
      ).resolves.toEqual({ code: 'publication_unavailable', ok: false })
      expect(redis.eval).not.toHaveBeenCalled()
    }
  )

  it('derives the private registrable domain from the normalized website', async () => {
    const redis = makeRedis()
    redis.eval.mockResolvedValue('allowed')
    const base = { sourceIp: '203.0.113.24', userId: 'user_123' }
    await enforceSubmissionRateLimits(
      { ...base, website: 'https://one.github.io/docs' },
      { redis, secret: SECRET }
    )
    await enforceSubmissionRateLimits(
      { ...base, website: 'https://one.github.io/other' },
      { redis, secret: SECRET }
    )
    expect(redis.eval.mock.calls[0]?.[1]?.[2]).toBe(redis.eval.mock.calls[1]?.[1]?.[2])
  })

  it('reports signing configuration failure before parsing create or consume inputs', async () => {
    const redis = makeRedis()
    await expect(
      createSubmissionContinuation(
        { fields: FIELDS, submissionId: 'sub_123', userId: 'user_123' },
        { now: () => NOW, redis, secret: 'short' }
      )
    ).resolves.toEqual({ code: 'publication_unavailable', ok: false })
    await expect(
      consumeSubmissionContinuation(
        { continuationToken: 'malformed', fields: FIELDS, userId: 'user_123' },
        { now: () => NOW, redis, secret: '' }
      )
    ).resolves.toEqual({ code: 'publication_unavailable', ok: false })
    expect(redis.get).not.toHaveBeenCalled()
  })
})
