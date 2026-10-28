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
const SUFFICIENT_PROSE_AND_LINK = `${'A useful developer API documentation index. '.repeat(4)}https://example.com/docs`
const LONG_TEXT = `# Example\n\n${SUFFICIENT_PROSE_AND_LINK}`
const CATEGORIES = [
  {
    description: 'APIs, frameworks, libraries, IDEs, and development utilities',
    name: 'Developer Tools',
    slug: 'developer-tools'
  }
] as const
const NON_DOCUMENT_H1_CASES: readonly (readonly [string, string])[] = [
  ['empty H1', `#\n\n${SUFFICIENT_PROSE_AND_LINK}`],
  ['blockquote H1', `> # Quoted title\n\n${SUFFICIENT_PROSE_AND_LINK}`],
  ['nested-list H1', `- Container\n\n  # Nested title\n\n${SUFFICIENT_PROSE_AND_LINK}`]
]
const FIELDS: SubmissionFields = {
  category: 'developer-tools',
  description: 'Useful developer API documentation.',
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
        : `<html><body>${'Meaningful developer API documentation homepage. '.repeat(5)}</body></html>`,
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
): PublicationAssessmentDependencies => ({
  categories: CATEGORIES,
  inspectResource,
  now: () => NOW
})

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

  it('rejects deterministic prohibited content after technical checks pass', async () => {
    const result = await assessPublicationFields(
      {
        ...FIELDS,
        description: 'Buy backlinks and paid website traffic from our link farm network.'
      },
      dependencies(async url => resource(url))
    )

    expect(result).toMatchObject({ decision: 'reject', reasonCode: 'prohibited_content' })
    expect(result.evidence).toContainEqual({
      check: 'editorial',
      decision: 'reject',
      details: { evidenceId: 'editorial:prohibited:search-manipulation' },
      reasonCode: 'prohibited_content'
    })
  })

  it('routes regulated editorial ambiguity to manual review', async () => {
    const result = await assessPublicationFields(
      { ...FIELDS, description: 'Example is an investment platform for financial planning.' },
      dependencies(async url => resource(url))
    )

    expect(result).toMatchObject({
      decision: 'manual_review',
      reasonCode: 'editorial_uncertainty'
    })
    expect(result.evidence).toContainEqual({
      check: 'editorial',
      decision: 'manual_review',
      details: { evidenceId: 'editorial:regulated:finance' },
      reasonCode: 'editorial_uncertainty'
    })
  })

  it('fails closed to manual review when category descriptors are unavailable', async () => {
    const result = await assessPublicationFields(FIELDS, {
      inspectResource: async url => resource(url),
      now: () => NOW
    })

    expect(result).toMatchObject({
      decision: 'manual_review',
      reasonCode: 'editorial_uncertainty'
    })
    expect(result.evidence).toContainEqual({
      check: 'editorial',
      decision: 'manual_review',
      details: { evidenceId: 'editorial:category:unknown' },
      reasonCode: 'editorial_uncertainty'
    })
  })

  it('keeps reputation unknown ahead of prohibited editorial content', async () => {
    const result = await assessPublicationFields(
      {
        ...FIELDS,
        description: 'Buy backlinks and paid website traffic from our link farm network.'
      },
      dependencies(async url =>
        url === FIELDS.website ? failure('reputation_unknown', 'reputation_unknown') : resource(url)
      )
    )

    expect(result).toMatchObject({ decision: 'retry_later', reasonCode: 'reputation_unknown' })
    expect(result.evidence.some(item => item.check === 'editorial')).toBe(false)
  })

  it('keeps an unsafe reputation match ahead of prohibited editorial content', async () => {
    const result = await assessPublicationFields(
      {
        ...FIELDS,
        description: 'Buy backlinks and paid website traffic from our link farm network.'
      },
      dependencies(async url =>
        url === FIELDS.website ? failure('reputation_match', 'reputation_match') : resource(url)
      )
    )

    expect(result).toMatchObject({ decision: 'reject', reasonCode: 'reputation_match' })
    expect(result.evidence.some(item => item.check === 'editorial')).toBe(false)
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

  it.each(NON_DOCUMENT_H1_CASES)(
    'sends a required llms resource with %s to manual review',
    async (_case, body) => {
      const result = await assessPublicationFields(
        FIELDS,
        dependencies(async url => resource(url, url === FIELDS.llmsUrl ? { body } : {}))
      )

      expect(result).toMatchObject({
        decision: 'manual_review',
        reasonCode: 'nonstandard_llms_format'
      })
    }
  )

  it.each(NON_DOCUMENT_H1_CASES)(
    'rejects an optional llms resource with %s',
    async (_case, body) => {
      const fields = { ...FIELDS, llmsFullUrl: 'https://example.com/llms-full.txt' }
      const result = await assessPublicationFields(
        fields,
        dependencies(async url =>
          resource(url, url === fields.llmsFullUrl ? { body, contentType: 'text/plain' } : {})
        )
      )

      expect(result).toMatchObject({
        decision: 'reject',
        reasonCode: 'invalid_optional_resource'
      })
    }
  )

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

  it('uses the completion time to reject reputation evidence that expires during inspection', async () => {
    let currentTime = new Date('2026-08-01T12:00:00.000Z')
    const result = await assessPublicationFields(FIELDS, {
      inspectResource: async url => {
        currentTime = new Date('2026-08-01T12:11:00.000Z')
        return resource(url)
      },
      now: () => currentTime
    })

    expect(result).toMatchObject({
      checkedAt: '2026-08-01T12:11:00.000Z',
      decision: 'retry_later',
      reasonCode: 'reputation_unknown'
    })
  })

  it('fails closed when every inspector result is absent at runtime', async () => {
    const absentResult: ResourceInspectionResult = JSON.parse('null')
    const result = await assessPublicationFields(
      FIELDS,
      dependencies(async () => absentResult)
    )

    expect(result).toMatchObject({
      decision: 'retry_later',
      reasonCode: 'publication_unavailable'
    })
  })

  it.each([
    ['duplicate media type', { contentType: 'text/plain, text/plain' }],
    [
      'mislabeled HTML',
      {
        body: `<!doctype html><html><body>${LONG_TEXT}</body></html>`,
        contentType: 'text/plain'
      }
    ],
    ['NUL-bearing text', { body: `${LONG_TEXT}\0binary` }],
    ['control-heavy text', { body: `${LONG_TEXT}\u0001\u0002\u0003` }]
  ])('rejects required llms %s', async (_case, override) => {
    const result = await assessPublicationFields(
      FIELDS,
      dependencies(async url => resource(url, url === FIELDS.llmsUrl ? override : {}))
    )

    expect(result).toMatchObject({ decision: 'reject', reasonCode: 'required_resource_missing' })
  })

  it.each([
    [
      'HTML after a leading comment',
      `\uFEFF \n<!-- generated -->\n<html><body></body></html>\n${LONG_TEXT}`
    ],
    [
      'HTML after an XML declaration',
      `<?xml version="1.0"?>\n<html><body></body></html>\n${LONG_TEXT}`
    ],
    ['active script markup', `<script src="https://example.com/app.js"></script>\n${LONG_TEXT}`],
    ['mid-body HTML', `${LONG_TEXT}\n<div>Injected HTML content</div>`]
  ])('rejects required llms %s', async (_case, body) => {
    const result = await assessPublicationFields(
      FIELDS,
      dependencies(async url => resource(url, url === FIELDS.llmsUrl ? { body } : {}))
    )

    expect(result).toMatchObject({ decision: 'reject', reasonCode: 'required_resource_missing' })
  })

  it('rejects a supplied one-character optional llms resource', async () => {
    const fields = { ...FIELDS, llmsFullUrl: 'https://example.com/llms-full.txt' }
    const result = await assessPublicationFields(
      fields,
      dependencies(async url =>
        resource(url, url === fields.llmsFullUrl ? { body: 'x', contentType: 'text/plain' } : {})
      )
    )

    expect(result).toMatchObject({ decision: 'reject', reasonCode: 'invalid_optional_resource' })
  })

  it('rejects format-only optional llms content', async () => {
    const fields = { ...FIELDS, llmsFullUrl: 'https://example.com/llms-full.txt' }
    const result = await assessPublicationFields(
      fields,
      dependencies(async url =>
        resource(
          url,
          url === fields.llmsFullUrl ? { body: '\u200b'.repeat(80), contentType: 'text/plain' } : {}
        )
      )
    )

    expect(result).toMatchObject({ decision: 'reject', reasonCode: 'invalid_optional_resource' })
  })

  it('accepts a meaningful optional llms resource', async () => {
    const fields = { ...FIELDS, llmsFullUrl: 'https://example.com/llms-full.txt' }
    const result = await assessPublicationFields(
      fields,
      dependencies(async url =>
        resource(
          url,
          url === fields.llmsFullUrl ? { body: LONG_TEXT, contentType: 'text/plain' } : {}
        )
      )
    )

    expect(result).toMatchObject({ decision: 'auto_publish', reasonCode: 'passed' })
  })

  it('accepts HTML examples inside optional Markdown code', async () => {
    const fields = { ...FIELDS, llmsFullUrl: 'https://example.com/llms-full.txt' }
    const body = `${LONG_TEXT}\n\nUse \`<script>\` only as an example.\n\n\`\`\`html\n<div>Example</div>\n\`\`\``
    const result = await assessPublicationFields(
      fields,
      dependencies(async url =>
        resource(url, url === fields.llmsFullUrl ? { body, contentType: 'text/markdown' } : {})
      )
    )

    expect(result).toMatchObject({ decision: 'auto_publish', reasonCode: 'passed' })
  })

  it('accepts a four-space-indented HTML example in required Markdown', async () => {
    const body = `${LONG_TEXT}\n\n    <script>exampleOnly()</script>`
    const result = await assessPublicationFields(
      FIELDS,
      dependencies(async url => resource(url, url === FIELDS.llmsUrl ? { body } : {}))
    )

    expect(result).toMatchObject({ decision: 'auto_publish', reasonCode: 'passed' })
  })

  it('accepts a tab-indented HTML example in optional Markdown', async () => {
    const fields = { ...FIELDS, llmsFullUrl: 'https://example.com/llms-full.txt' }
    const body = `${LONG_TEXT}\n\n\t<div>Example only</div>`
    const result = await assessPublicationFields(
      fields,
      dependencies(async url =>
        resource(url, url === fields.llmsFullUrl ? { body, contentType: 'text/markdown' } : {})
      )
    )

    expect(result).toMatchObject({ decision: 'auto_publish', reasonCode: 'passed' })
  })

  it.each([' \t', '  \t', '   \t'])(
    'accepts a mixed %j-indented HTML example in required Markdown',
    async indentation => {
      const body = `${LONG_TEXT}\n\n${indentation}<script>exampleOnly()</script>`
      const result = await assessPublicationFields(
        FIELDS,
        dependencies(async url => resource(url, url === FIELDS.llmsUrl ? { body } : {}))
      )

      expect(result).toMatchObject({ decision: 'auto_publish', reasonCode: 'passed' })
    }
  )

  it('rejects active HTML after a longer valid fence closer', async () => {
    const body = `${LONG_TEXT}\n\n\`\`\`html\n<div>Code example</div>\n\`\`\`\`\n<script>active()</script>`
    const result = await assessPublicationFields(
      FIELDS,
      dependencies(async url => resource(url, url === FIELDS.llmsUrl ? { body } : {}))
    )

    expect(result).toMatchObject({ decision: 'reject', reasonCode: 'required_resource_missing' })
  })

  it('rejects active HTML inside a list container', async () => {
    const body = `${LONG_TEXT}\n\n- Example item\n\n    <script>active()</script>`
    const result = await assessPublicationFields(
      FIELDS,
      dependencies(async url => resource(url, url === FIELDS.llmsUrl ? { body } : {}))
    )

    expect(result).toMatchObject({ decision: 'reject', reasonCode: 'required_resource_missing' })
  })

  it('rejects a multiline HTML opening tag longer than the legacy scan ceiling', async () => {
    const body = `${LONG_TEXT}\n\n<section data-payload="${'x'.repeat(600)}"\n data-extra="active">`
    const result = await assessPublicationFields(
      FIELDS,
      dependencies(async url => resource(url, url === FIELDS.llmsUrl ? { body } : {}))
    )

    expect(result).toMatchObject({ decision: 'reject', reasonCode: 'required_resource_missing' })
  })

  it.each([4, 5, 6])(
    'accepts HTML code in a %s-character fence with a longer closer',
    async fenceLength => {
      const opening = '`'.repeat(fenceLength)
      const closing = '`'.repeat(fenceLength + 1)
      const body = `${LONG_TEXT}\n\n${opening}html\n<script>exampleOnly()</script>\n${closing}`
      const result = await assessPublicationFields(
        FIELDS,
        dependencies(async url => resource(url, url === FIELDS.llmsUrl ? { body } : {}))
      )

      expect(result).toMatchObject({ decision: 'auto_publish', reasonCode: 'passed' })
    }
  )

  it('accepts HTML in a double-backtick inline span containing a single backtick', async () => {
    const body = `${LONG_TEXT}\n\nUse \`\`<script>example\`only</script>\`\` safely.`
    const result = await assessPublicationFields(
      FIELDS,
      dependencies(async url => resource(url, url === FIELDS.llmsUrl ? { body } : {}))
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

  it.each([
    ['https://victim.github.io', 'https://attacker.github.io/llms.txt'],
    ['https://victim.vercel.app', 'https://attacker.vercel.app/llms.txt']
  ])('rejects a final redirect across private suffix tenants', async (website, finalUrl) => {
    const fields = { ...FIELDS, llmsUrl: `${website}/llms.txt`, website }
    const result = await assessPublicationFields(
      fields,
      dependencies(async url =>
        resource(
          url,
          url === fields.llmsUrl
            ? {
                finalUrl,
                redirectUrls: [finalUrl],
                reputationChecks: [
                  { reputation: { checkedAt: CHECKED_AT, status: 'safe' }, url },
                  { reputation: { checkedAt: CHECKED_AT, status: 'safe' }, url: finalUrl }
                ]
              }
            : {}
        )
      )
    )

    expect(result).toMatchObject({ decision: 'reject', reasonCode: 'unrelated_site_family' })
  })

  it.each([
    ['https://victim.github.io', 'https://docs.victim.github.io/llms.txt'],
    ['https://victim.vercel.app', 'https://docs.victim.vercel.app/llms.txt']
  ])('accepts subdomains within one private suffix tenant', async (website, llmsUrl) => {
    const fields = { ...FIELDS, llmsUrl, name: 'Victim', website }
    const result = await assessPublicationFields(
      fields,
      dependencies(async url => resource(url))
    )

    expect(result).toMatchObject({ decision: 'auto_publish', reasonCode: 'passed' })
  })

  it('keeps an unrelated submitted private documentation tenant in manual review', async () => {
    const fields = {
      ...FIELDS,
      llmsUrl: 'https://docs-team.vercel.app/llms.txt',
      website: 'https://victim.github.io'
    }
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

  it.each([408, 429, 503])(
    'rejects an unrelated final redirect with transient HTTP %s without body content',
    async statusCode => {
      const finalUrl = 'https://attacker.example.net/llms.txt'
      const result = await assessPublicationFields(
        FIELDS,
        dependencies(async url =>
          resource(
            url,
            url === FIELDS.llmsUrl
              ? {
                  body: undefined,
                  byteCount: 0,
                  contentType: 'application/octet-stream',
                  finalUrl,
                  redirectUrls: [finalUrl],
                  reputationChecks: [
                    { reputation: { checkedAt: CHECKED_AT, status: 'safe' }, url },
                    { reputation: { checkedAt: CHECKED_AT, status: 'safe' }, url: finalUrl }
                  ],
                  statusCode
                }
              : {}
          )
        )
      )

      expect(result).toMatchObject({ decision: 'reject', reasonCode: 'unrelated_site_family' })
    }
  )

  it.each([408, 429, 503])(
    'retries a same-family transient HTTP %s without body content',
    async statusCode => {
      const result = await assessPublicationFields(
        FIELDS,
        dependencies(async url =>
          resource(
            url,
            url === FIELDS.llmsUrl
              ? {
                  body: undefined,
                  byteCount: 0,
                  contentType: 'application/octet-stream',
                  statusCode
                }
              : {}
          )
        )
      )

      expect(result).toMatchObject({
        decision: 'retry_later',
        reasonCode: 'required_resource_transient_failure'
      })
    }
  )

  it('rejects an unrelated optional transient redirect as an invalid optional resource', async () => {
    const fields = { ...FIELDS, llmsFullUrl: 'https://example.com/llms-full.txt' }
    const finalUrl = 'https://attacker.example.net/llms-full.txt'
    const result = await assessPublicationFields(
      fields,
      dependencies(async url =>
        resource(
          url,
          url === fields.llmsFullUrl
            ? {
                body: undefined,
                byteCount: 0,
                finalUrl,
                redirectUrls: [finalUrl],
                reputationChecks: [
                  { reputation: { checkedAt: CHECKED_AT, status: 'safe' }, url },
                  { reputation: { checkedAt: CHECKED_AT, status: 'safe' }, url: finalUrl }
                ],
                statusCode: 503
              }
            : {}
        )
      )
    )

    expect(result).toMatchObject({ decision: 'reject', reasonCode: 'invalid_optional_resource' })
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

  it('sanitizes malicious runtime failure evidence at the assessment boundary', async () => {
    const maliciousFailure: ResourceInspectionResult = JSON.parse(
      JSON.stringify({
        failure: {
          evidence: {
            byteCount: 9e99,
            checkedAt: 'not-a-date-secret',
            contentType: 'x'.repeat(10_000),
            durationBucket: 'private-duration',
            evidenceId: 'e'.repeat(10_000),
            finalHost: `${'private'.repeat(100)}.example.com`,
            providerStatus: 'unsafe',
            rawBody: 'raw-secret-body',
            redirectHosts: Array.from({ length: 1_000 }, (_, index) => `hop-${index}.example.com`),
            statusCode: 99_999,
            threatTypes: [
              `  ${'A'.repeat(200)}  `,
              'SECOND',
              { secret: 'object-secret' },
              'THIRD',
              'FOURTH',
              'FIFTH'
            ]
          },
          kind: 'reputation_match',
          safeMessage: 'Safe message.'
        },
        ok: false,
        reasonCode: 'reputation_match'
      })
    )
    const result = await assessPublicationFields(
      FIELDS,
      dependencies(async url => (url === FIELDS.llmsUrl ? maliciousFailure : resource(url)))
    )
    const details = result.evidence.find(item => item.reasonCode === 'reputation_match')?.details
    const serialized = JSON.stringify(result)

    expect(Object.keys(details ?? {}).sort()).toEqual([
      'byteCount',
      'contentType',
      'evidenceId',
      'providerStatus',
      'redirectHosts',
      'threatTypes'
    ])
    expect(details?.byteCount).toBe(SUBMISSION_LLMS_MAX_BYTES + 1)
    expect(details?.contentType?.length).toBeLessThanOrEqual(128)
    expect(details?.evidenceId?.length).toBeLessThanOrEqual(128)
    expect(details?.redirectHosts).toHaveLength(3)
    expect(details?.threatTypes).toHaveLength(4)
    expect(details?.threatTypes?.every(value => value.length <= 64)).toBe(true)
    expect(serialized).not.toMatch(/raw-secret-body|object-secret|not-a-date-secret/)
  })

  it('bounds redirect evidence before traversing a malformed successful result', async () => {
    const redirectUrls = new Array<string>(1_000)
    redirectUrls[0] = 'https://example.com/redirect'
    Object.defineProperty(redirectUrls, 32, {
      get() {
        throw new Error('unbounded redirect traversal')
      }
    })

    const result = await assessPublicationFields(
      FIELDS,
      dependencies(async url => resource(url, url === FIELDS.llmsUrl ? { redirectUrls } : {}))
    )

    expect(result).toMatchObject({ decision: 'retry_later', reasonCode: 'reputation_unknown' })
  })

  it.each([
    ['timeout', 'timeout', 'required_resource_transient_failure'],
    ['transport failure', 'transport_failure', 'required_resource_transient_failure'],
    ['unknown reputation', 'reputation_unknown', 'reputation_unknown']
  ] as const)('retries optional transient failure: %s', async (_case, kind, reasonCode) => {
    const fields = { ...FIELDS, llmsFullUrl: 'https://example.com/llms-full.txt' }
    const result = await assessPublicationFields(
      fields,
      dependencies(async url =>
        url === fields.llmsFullUrl ? failure(kind, reasonCode) : resource(url)
      )
    )

    expect(result.decision).toBe('retry_later')
  })

  it.each([408, 429, 503])(
    'retries optional transient HTTP %s despite hostile content',
    async statusCode => {
      const fields = { ...FIELDS, llmsFullUrl: 'https://example.com/llms-full.txt' }
      const result = await assessPublicationFields(
        fields,
        dependencies(async url =>
          resource(
            url,
            url === fields.llmsFullUrl
              ? {
                  body: '<html>hostile body</html>',
                  contentType: 'application/octet-stream',
                  statusCode
                }
              : {}
          )
        )
      )

      expect(result.decision).toBe('retry_later')
    }
  )

  it.each([404, 410])(
    'keeps optional stable HTTP %s as invalid_optional_resource despite hostile content',
    async statusCode => {
      const fields = { ...FIELDS, llmsFullUrl: 'https://example.com/llms-full.txt' }
      const result = await assessPublicationFields(
        fields,
        dependencies(async url =>
          resource(
            url,
            url === fields.llmsFullUrl
              ? { body: '<html>hostile</html>', contentType: 'application/pdf', statusCode }
              : {}
          )
        )
      )

      expect(result).toMatchObject({ decision: 'reject', reasonCode: 'invalid_optional_resource' })
    }
  )

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
