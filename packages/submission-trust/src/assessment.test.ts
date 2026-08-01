import { describe, expect, it, vi } from 'vitest'
import { assessPublicationFields } from './assessment.js'
import { SUBMISSION_HOMEPAGE_MAX_BYTES, SUBMISSION_LLMS_MAX_BYTES } from './constants.js'
import type {
  InspectedResource,
  PublicationAssessmentDependencies,
  ResourceInspectionFailure,
  ResourceInspectionResult,
  SubmissionFields
} from './types.js'

const NOW = new Date('2026-08-01T12:00:00.000Z')
const CHECKED_AT = NOW.toISOString()
const LONG_TEXT = `${'# Example\n\n'}${'A useful documentation index. '.repeat(4)}https://example.com/docs`
const FIELDS: SubmissionFields = {
  category: 'developer-tools',
  description: 'Useful example documentation.',
  llmsUrl: 'https://example.com/llms.txt',
  name: 'Example',
  publishedAt: '2026-08-01',
  website: 'https://www.example.com'
}

const resource = (
  requestedUrl: string,
  overrides: Partial<InspectedResource> = {}
): ResourceInspectionResult => {
  const safe = { checkedAt: CHECKED_AT, status: 'safe' } as const
  return {
    ok: true,
    resource: {
      body: requestedUrl.endsWith('llms.txt')
        ? LONG_TEXT
        : `<html><body>${'Meaningful homepage. '.repeat(5)}</body></html>`,
      byteCount: 128,
      contentType: requestedUrl.endsWith('llms.txt') ? 'text/plain; charset=utf-8' : 'text/html',
      finalUrl: requestedUrl,
      redirectUrls: [],
      reputation: safe,
      reputationChecks: [{ reputation: safe, url: requestedUrl }],
      requestedUrl,
      statusCode: 200,
      ...overrides
    }
  }
}

const failure = (
  kind: ResourceInspectionFailure['kind'],
  reasonCode: Extract<ResourceInspectionResult, { ok: false }>['reasonCode'],
  evidence: ResourceInspectionFailure['evidence'] = {}
): ResourceInspectionResult => ({
  failure: { evidence, kind, safeMessage: 'Safe inspection failure.' },
  ok: false,
  reasonCode
})

const dependencies = (
  inspectResource: PublicationAssessmentDependencies['inspectResource']
): PublicationAssessmentDependencies => ({ inspectResource, now: () => NOW })

describe('assessPublicationFields', () => {
  it('inspects homepage, llms, and optional llms-full with bounded options', async () => {
    const fields = { ...FIELDS, llmsFullUrl: 'https://example.com/llms-full.txt' }
    const inspectResource = vi.fn(async (url: string) =>
      resource(url, url.endsWith('llms-full.txt') ? { body: LONG_TEXT } : {})
    )

    await assessPublicationFields(fields, dependencies(inspectResource))

    expect(inspectResource.mock.calls).toEqual([
      [fields.website, { maxBytes: SUBMISSION_HOMEPAGE_MAX_BYTES }],
      [fields.llmsUrl, { maxBytes: SUBMISSION_LLMS_MAX_BYTES }],
      [fields.llmsFullUrl, { maxBytes: SUBMISSION_LLMS_MAX_BYTES, optional: true }]
    ])
  })

  it('does not inspect an absent optional URL', async () => {
    const inspectResource = vi.fn(async (url: string) => resource(url))

    await assessPublicationFields(FIELDS, dependencies(inspectResource))

    expect(inspectResource).toHaveBeenCalledTimes(2)
  })

  it.each([404, 410])('rejects stable required HTTP %s responses', async statusCode => {
    const result = await assessPublicationFields(
      FIELDS,
      dependencies(async url => resource(url, url === FIELDS.llmsUrl ? { statusCode } : {}))
    )

    expect(result).toMatchObject({ decision: 'reject', reasonCode: 'required_resource_missing' })
  })

  it.each([408, 429, 500, 503])(
    'retries transient required HTTP %s responses',
    async statusCode => {
      const result = await assessPublicationFields(
        FIELDS,
        dependencies(async url => resource(url, url === FIELDS.llmsUrl ? { statusCode } : {}))
      )

      expect(result).toMatchObject({
        decision: 'retry_later',
        reasonCode: 'required_resource_transient_failure'
      })
    }
  )

  it.each(['timeout', 'transport_failure'] as const)('retries required %s failures', async kind => {
    const result = await assessPublicationFields(
      FIELDS,
      dependencies(async url =>
        url === FIELDS.llmsUrl
          ? failure(kind, 'required_resource_transient_failure')
          : resource(url)
      )
    )

    expect(result.decision).toBe('retry_later')
  })

  it.each([
    ['non-HTML homepage', { contentType: 'text/plain' }],
    ['empty homepage', { body: '   ' }],
    ['unsuccessful homepage', { statusCode: 404 }]
  ])('rejects %s', async (_case, override) => {
    const result = await assessPublicationFields(
      FIELDS,
      dependencies(async url => resource(url, url === FIELDS.website ? override : {}))
    )
    expect(result).toMatchObject({ decision: 'reject', reasonCode: 'required_resource_missing' })
  })

  it.each([
    ['HTML', { contentType: 'text/html' }],
    ['binary', { contentType: 'application/octet-stream' }],
    ['missing body', { body: undefined }]
  ])('rejects required llms %s content', async (_case, override) => {
    const result = await assessPublicationFields(
      FIELDS,
      dependencies(async url => resource(url, url === FIELDS.llmsUrl ? override : {}))
    )
    expect(result).toMatchObject({ decision: 'reject', reasonCode: 'required_resource_missing' })
  })

  it('rejects a required invalid UTF-8 inspector result', async () => {
    const result = await assessPublicationFields(
      FIELDS,
      dependencies(async url =>
        url === FIELDS.llmsUrl
          ? failure('invalid_encoding', 'required_resource_missing')
          : resource(url)
      )
    )
    expect(result).toMatchObject({ decision: 'reject', reasonCode: 'required_resource_missing' })
  })

  it.each([
    ['short', '# Short\nhttps://example.com'],
    ['no H1', `${'Useful documentation. '.repeat(6)}https://example.com/docs`],
    ['no absolute link', `# Example\n\n${'Useful documentation text. '.repeat(6)}`]
  ])('sends structurally nonstandard %s llms text to manual review', async (_case, body) => {
    const result = await assessPublicationFields(
      FIELDS,
      dependencies(async url => resource(url, url === FIELDS.llmsUrl ? { body } : {}))
    )
    expect(result).toMatchObject({
      decision: 'manual_review',
      reasonCode: 'nonstandard_llms_format'
    })
  })

  it.each([
    ['missing', { statusCode: 404 }],
    ['HTML', { contentType: 'text/html' }],
    ['binary', { contentType: 'application/pdf' }]
  ])('rejects supplied optional %s content with actionable message', async (_case, override) => {
    const fields = { ...FIELDS, llmsFullUrl: 'https://example.com/llms-full.txt' }
    const result = await assessPublicationFields(
      fields,
      dependencies(async url => resource(url, url === fields.llmsFullUrl ? override : {}))
    )
    expect(result).toMatchObject({ decision: 'reject', reasonCode: 'invalid_optional_resource' })
    expect(result.publicMessage).toMatch(/fix|remove/i)
  })

  it('rejects supplied optional invalid UTF-8', async () => {
    const fields = { ...FIELDS, llmsFullUrl: 'https://example.com/llms-full.txt' }
    const result = await assessPublicationFields(
      fields,
      dependencies(async url =>
        url === fields.llmsFullUrl
          ? failure('invalid_encoding', 'invalid_optional_resource')
          : resource(url)
      )
    )
    expect(result.reasonCode).toBe('invalid_optional_resource')
  })

  it('allows submitted URLs in the same registrable family', async () => {
    const result = await assessPublicationFields(
      FIELDS,
      dependencies(async url => resource(url))
    )
    expect(result).toMatchObject({ decision: 'auto_publish', reasonCode: 'passed' })
  })

  it('sends a different submitted documentation family to manual review', async () => {
    const fields = { ...FIELDS, llmsUrl: 'https://docs-host.example.net/llms.txt' }
    const result = await assessPublicationFields(
      fields,
      dependencies(async url => resource(url))
    )
    expect(result).toMatchObject({ decision: 'manual_review', reasonCode: 'site_family_uncertain' })
  })

  it('rejects an actual final redirect outside the submitted resource and website families', async () => {
    const result = await assessPublicationFields(
      FIELDS,
      dependencies(async url =>
        resource(
          url,
          url === FIELDS.llmsUrl
            ? {
                finalUrl: 'https://attacker.example.net/llms.txt',
                redirectUrls: ['https://attacker.example.net/llms.txt'],
                reputationChecks: [
                  { reputation: { checkedAt: CHECKED_AT, status: 'safe' }, url },
                  {
                    reputation: { checkedAt: CHECKED_AT, status: 'safe' },
                    url: 'https://attacker.example.net/llms.txt'
                  }
                ]
              }
            : {}
        )
      )
    )
    expect(result).toMatchObject({ decision: 'reject', reasonCode: 'unrelated_site_family' })
  })

  it.each([
    [failure('reputation_match', 'reputation_match', { providerStatus: 'unsafe' }), 'reject'],
    [
      failure('reputation_unknown', 'reputation_unknown', { providerStatus: 'unknown' }),
      'retry_later'
    ]
  ] as const)(
    'gives reputation outcome precedence over format ambiguity',
    async (reputation, decision) => {
      const result = await assessPublicationFields(
        FIELDS,
        dependencies(async url => (url === FIELDS.llmsUrl ? reputation : resource(url)))
      )
      expect(result.decision).toBe(decision)
    }
  )

  it.each([
    ['missing evidence', []],
    [
      'stale evidence',
      [
        {
          reputation: { checkedAt: '2026-08-01T11:49:59.999Z', status: 'safe' as const },
          url: FIELDS.llmsUrl
        }
      ]
    ]
  ])('retries for %s on a requested or redirect hop', async (_case, reputationChecks) => {
    const result = await assessPublicationFields(
      FIELDS,
      dependencies(async url => resource(url, url === FIELDS.llmsUrl ? { reputationChecks } : {}))
    )
    expect(result).toMatchObject({ decision: 'retry_later', reasonCode: 'reputation_unknown' })
  })

  it('retains only bounded evidence metadata, never fetched bodies or raw secrets', async () => {
    const secretBody = `${LONG_TEXT} raw-secret-body api-key-private`
    const result = await assessPublicationFields(
      FIELDS,
      dependencies(async url =>
        resource(url, { body: url === FIELDS.llmsUrl ? secretBody : `<html>${secretBody}</html>` })
      )
    )
    const serialized = JSON.stringify(result)
    expect(result.evidence).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          details: expect.objectContaining({
            byteCount: 128,
            checkedAt: CHECKED_AT,
            finalHost: expect.any(String),
            providerStatus: 'safe',
            redirectHosts: [],
            statusCode: 200
          })
        })
      ])
    )
    expect(serialized).not.toContain('raw-secret-body')
    expect(serialized).not.toContain('api-key-private')
  })

  it('merges reject above retry, retry above manual, and manual above auto', async () => {
    const fields = { ...FIELDS, llmsFullUrl: 'https://example.com/llms-full.txt' }
    const result = await assessPublicationFields(
      fields,
      dependencies(async url => {
        if (url === fields.website) return failure('reputation_unknown', 'reputation_unknown')
        if (url === fields.llmsFullUrl)
          return failure('invalid_encoding', 'invalid_optional_resource')
        return resource(url, { body: '# short' })
      })
    )
    expect(result).toMatchObject({ decision: 'reject', reasonCode: 'invalid_optional_resource' })
  })
})
