import { createHmac } from 'node:crypto'

import { describe, expect, it } from 'vitest'
import type {
  AssessmentAttestationExpectation,
  AssessmentAttestationVerificationFailureCode
} from './attestation.js'
import { createAssessmentAttestation, verifyAssessmentAttestation } from './attestation.js'

const SECRET = '0123456789abcdef0123456789abcdef'
const NOW = new Date('2026-08-01T12:05:00.000Z')
const HEAD_SHA = 'a'.repeat(40)
const CONTENT_SHA = 'b'.repeat(64)

const PAYLOAD = {
  repository: 'owner/llms-txt-hub',
  submissionId: 'submission-123',
  prNumber: 42,
  headSha: HEAD_SHA,
  mdxPath: 'packages/content/data/websites/example-llms-txt.mdx',
  mdxContentSha256: CONTENT_SHA,
  website: 'https://B\u00dcCHER.de:443/docs#about',
  llmsUrl: 'https://b\u00fccher.de:443/llms.txt#top',
  llmsFullUrl: 'https://b\u00fccher.de/llms-full.txt',
  decision: 'auto_publish',
  policyVersion: '2026-08-01.v1',
  webRiskCheckedAt: '2026-08-01T12:00:00.000Z',
  issuedAt: '2026-08-01T12:04:00.000Z',
  expiresAt: '2026-08-01T12:10:00.000Z'
} as const

const EXPECTED = {
  repository: PAYLOAD.repository,
  submissionId: PAYLOAD.submissionId,
  prNumber: PAYLOAD.prNumber,
  headSha: PAYLOAD.headSha,
  mdxPath: PAYLOAD.mdxPath,
  mdxContentSha256: PAYLOAD.mdxContentSha256,
  website: 'https://xn--bcher-kva.de/docs',
  llmsUrl: 'https://xn--bcher-kva.de/llms.txt',
  llmsFullUrl: 'https://xn--bcher-kva.de/llms-full.txt',
  policyVersion: PAYLOAD.policyVersion,
  webRiskCheckedAt: PAYLOAD.webRiskCheckedAt
} satisfies AssessmentAttestationExpectation

const BINDING_MISMATCH_CASES: readonly [
  string,
  Partial<AssessmentAttestationExpectation>,
  AssessmentAttestationVerificationFailureCode
][] = [
  ['repository', { repository: 'attacker/repository' }, 'repository_mismatch'],
  ['submission ID', { submissionId: 'submission-other' }, 'submission_id_mismatch'],
  ['PR', { prNumber: 43 }, 'pr_number_mismatch'],
  ['head SHA', { headSha: 'c'.repeat(40) }, 'head_sha_mismatch'],
  ['path', { mdxPath: 'packages/content/data/websites/other.mdx' }, 'mdx_path_mismatch'],
  ['content hash', { mdxContentSha256: 'd'.repeat(64) }, 'mdx_content_hash_mismatch'],
  ['website', { website: 'https://other.example.com' }, 'website_mismatch'],
  ['llms URL', { llmsUrl: 'https://other.example.com/llms.txt' }, 'llms_url_mismatch'],
  ['llms-full URL', { llmsFullUrl: undefined }, 'llms_full_url_mismatch'],
  ['policy', { policyVersion: '2026-08-02.v1' }, 'policy_version_mismatch'],
  [
    'Web Risk time',
    { webRiskCheckedAt: '2026-08-01T12:01:00.000Z' },
    'web_risk_checked_at_mismatch'
  ]
]

const { expiresAt: reorderedExpiry, ...payloadWithoutExpiry } = PAYLOAD
const REORDERED_PAYLOAD = JSON.stringify({
  expiresAt: reorderedExpiry,
  ...payloadWithoutExpiry
})

const createBlock = (payload: string, secret = SECRET): string => {
  const encodedPayload = Buffer.from(payload).toString('base64url')
  const signature = createHmac('sha256', secret).update(payload).digest('base64url')
  return `<!-- llms-hub-assessment:v1\n${encodedPayload}\n${signature}\n-->`
}

const signed = (): string => {
  const result = createAssessmentAttestation(PAYLOAD, SECRET)
  if (!result.ok) throw new Error(`signing failed: ${result.code}`)
  return result.block
}

const verify = (
  body = signed(),
  expected: AssessmentAttestationExpectation = EXPECTED,
  secret = SECRET,
  now = NOW
) => verifyAssessmentAttestation({ body, expected, now: () => now, secret })

describe('createAssessmentAttestation', () => {
  it('uses exact fixed payload ordering, URL normalization, and canonical base64url', () => {
    const result = createAssessmentAttestation(PAYLOAD, SECRET)

    expect(result.ok).toBe(true)
    if (!result.ok) return
    const [, encodedPayload = '', signature = ''] = result.block.split('\n')
    expect(encodedPayload).toMatch(/^[A-Za-z0-9_-]+$/)
    expect(signature).toMatch(/^[A-Za-z0-9_-]{43}$/)
    expect(Buffer.from(encodedPayload, 'base64url').toString()).toBe(
      '{"repository":"owner/llms-txt-hub","submissionId":"submission-123","prNumber":42,"headSha":"aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa","mdxPath":"packages/content/data/websites/example-llms-txt.mdx","mdxContentSha256":"bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb","website":"https://xn--bcher-kva.de/docs","llmsUrl":"https://xn--bcher-kva.de/llms.txt","llmsFullUrl":"https://xn--bcher-kva.de/llms-full.txt","decision":"auto_publish","policyVersion":"2026-08-01.v1","webRiskCheckedAt":"2026-08-01T12:00:00.000Z","issuedAt":"2026-08-01T12:04:00.000Z","expiresAt":"2026-08-01T12:10:00.000Z"}'
    )
  })

  it('omits the optional llms-full field without changing the remaining order', () => {
    const { llmsFullUrl: _omitted, ...withoutLlmsFull } = PAYLOAD
    const result = createAssessmentAttestation(withoutLlmsFull, SECRET)

    expect(result.ok).toBe(true)
    if (!result.ok) return
    const [, encodedPayload = ''] = result.block.split('\n')
    const decoded = Buffer.from(encodedPayload, 'base64url').toString()
    expect(decoded).not.toContain('llmsFullUrl')
    expect(decoded.indexOf('llmsUrl')).toBeLessThan(decoded.indexOf('decision'))
  })

  it('requires at least 32 secret bytes without exposing the secret', () => {
    const weakSecret = '\u00e9'.repeat(15)

    const result = createAssessmentAttestation(PAYLOAD, weakSecret)

    expect(result).toEqual({ code: 'secret_too_short', ok: false })
    expect(JSON.stringify(result)).not.toContain(weakSecret)
  })

  it('rejects a Web Risk timestamp later than attestation issuance', () => {
    expect(
      createAssessmentAttestation(
        { ...PAYLOAD, webRiskCheckedAt: '2026-08-01T12:04:00.001Z' },
        SECRET
      )
    ).toEqual({ code: 'invalid_payload', ok: false })
  })
})

describe('verifyAssessmentAttestation', () => {
  it('accepts the exact untouched signed payload and returns normalized bindings', () => {
    expect(verify()).toEqual({
      ok: true,
      payload: {
        ...PAYLOAD,
        website: EXPECTED.website,
        llmsUrl: EXPECTED.llmsUrl,
        llmsFullUrl: EXPECTED.llmsFullUrl
      }
    })
  })

  it.each(BINDING_MISMATCH_CASES)('rejects a %s binding mismatch', (_label, change, code) => {
    expect(verify(signed(), { ...EXPECTED, ...change })).toEqual({ code, ok: false })
  })

  it('rejects expired and not-yet-issued attestations', () => {
    expect(verify(signed(), EXPECTED, SECRET, new Date(PAYLOAD.expiresAt))).toEqual({
      code: 'expired',
      ok: false
    })
    expect(verify(signed(), EXPECTED, SECRET, new Date('2026-08-01T12:03:59.999Z'))).toEqual({
      code: 'not_yet_valid',
      ok: false
    })
  })

  it('rejects signature and payload tampering without returning either value', () => {
    const block = signed()
    const lines = block.split('\n')
    const signature = lines[2] ?? ''
    const tamperedSignature = `${signature.slice(0, -1)}${signature.endsWith('A') ? 'B' : 'A'}`
    const tampered = [lines[0], lines[1], tamperedSignature, lines[3]].join('\n')

    const result = verify(tampered)

    expect(result).toEqual({ code: 'invalid_signature', ok: false })
    expect(JSON.stringify(result)).not.toContain(signature)
    expect(JSON.stringify(result)).not.toContain(SECRET)
  })

  it('rejects content tampering before parsing attacker-controlled JSON', () => {
    const lines = signed().split('\n')
    const encodedPayload = lines[1] ?? ''
    lines[1] = `${encodedPayload.slice(0, -1)}${encodedPayload.endsWith('A') ? 'B' : 'A'}`

    expect(verify(lines.join('\n'))).toEqual({ code: 'invalid_signature', ok: false })
  })

  it('returns a stable failure for malformed runtime expectation values', () => {
    const malformedInput = {
      body: signed(),
      expected: { ...EXPECTED, repository: Symbol('not-a-string') },
      now: () => NOW,
      secret: SECRET
    }

    expect(() =>
      Reflect.apply(verifyAssessmentAttestation, undefined, [malformedInput])
    ).not.toThrow()
    expect(Reflect.apply(verifyAssessmentAttestation, undefined, [malformedInput])).toEqual({
      code: 'invalid_expectation',
      ok: false
    })
  })

  it.each([
    ['', 'missing_block'],
    ['<!-- llms-hub-assessment:v1\nnot base64\nsignature\n-->', 'malformed_block'],
    ['<!-- llms-hub-assessment:v2\nabc\ndef\n-->', 'malformed_block'],
    ['<!-- llms-hub-assessment: v1\nabc\ndef\n-->', 'malformed_block'],
    ['<!-- LLMS-HUB-ASSESSMENT:v1\nabc\ndef\n-->', 'malformed_block']
  ])('rejects a missing or near-miss block with stable code', (body, code) => {
    expect(verify(body)).toEqual({ code, ok: false })
  })

  it('rejects duplicate blocks, including one malformed duplicate', () => {
    expect(verify(`${signed()}\n${signed()}`)).toEqual({ code: 'duplicate_block', ok: false })
    expect(verify(`${signed()}\n<!-- llms-hub-assessment:v1\nbroken\n-->`)).toEqual({
      code: 'duplicate_block',
      ok: false
    })
  })

  it.each([
    ['duplicate keys', '{"repository":"owner/llms-txt-hub","repository":"attacker/repository"}'],
    ['prototype key', '{"__proto__":{"polluted":true}}'],
    ['extra fields', JSON.stringify({ ...PAYLOAD, role: 'admin' })],
    ['unsafe PR number', JSON.stringify({ ...PAYLOAD, prNumber: Number.MAX_SAFE_INTEGER })],
    ['wrong decision', JSON.stringify({ ...PAYLOAD, decision: 'manual_review' })],
    ['noncanonical Unicode escape', JSON.stringify(PAYLOAD).replace('owner', '\\u006fwner')],
    ['reordered fields', REORDERED_PAYLOAD]
  ])('rejects signed but noncanonical payloads with %s', (_label, payload) => {
    expect(verify(createBlock(payload))).toEqual({ code: 'invalid_payload', ok: false })
  })

  it.each([
    ['padding', (value: string) => `${value}=`],
    ['non-url alphabet', (value: string) => `${value.slice(0, -1)}+`],
    ['wrong length', (value: string) => value.slice(1)]
  ])('rejects a %s signature encoding', (_label, mutate) => {
    const lines = signed().split('\n')
    const signature = lines[2] ?? ''
    lines[2] = mutate(signature)

    expect(verify(lines.join('\n'))).toEqual({ code: 'malformed_block', ok: false })
  })

  it('rejects malformed timestamp ordering and oversized bodies', () => {
    expect(
      verify(
        createBlock(
          JSON.stringify({
            ...PAYLOAD,
            issuedAt: '2026-08-01T12:10:00.000Z',
            expiresAt: '2026-08-01T12:04:00.000Z'
          })
        )
      )
    ).toEqual({ code: 'invalid_payload', ok: false })
    expect(verify(`x${'a'.repeat(100_000)}`)).toEqual({ code: 'body_too_large', ok: false })
  })
})
