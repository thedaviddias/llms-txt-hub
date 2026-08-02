import { describe, expect, it } from 'vitest'
import { assessEditorialPolicy } from './editorial-policy.js'
import type { SubmissionFields } from './types.js'

const CATEGORIES = [
  {
    description: 'APIs, frameworks, libraries, IDEs, and development utilities',
    name: 'Developer Tools',
    slug: 'developer-tools'
  },
  {
    description: 'Financial services, payment platforms, and fintech tools',
    name: 'Finance & Fintech',
    slug: 'finance-fintech'
  },
  {
    description: 'Security tools, authentication, encryption, and compliance',
    name: 'Security & Identity',
    slug: 'security-identity'
  }
] as const

const FIELDS: SubmissionFields = {
  category: 'developer-tools',
  description: 'Acme provides API documentation and developer tools for building web applications.',
  llmsUrl: 'https://acme.dev/llms.txt',
  name: 'Acme',
  publishedAt: '2026-08-01',
  website: 'https://acme.dev'
}

const assess = (
  overrides: Partial<SubmissionFields> = {},
  content: { homepageText?: string; llmsFullText?: string; llmsText?: string } = {}
) =>
  assessEditorialPolicy({
    categories: CATEGORIES,
    fields: { ...FIELDS, ...overrides },
    homepageText:
      content.homepageText ??
      'Acme developer documentation for APIs, SDKs, libraries, and web application tooling.',
    llmsFullText: content.llmsFullText,
    llmsText:
      content.llmsText ??
      '# Acme\n\nDeveloper API documentation, SDK references, frameworks, and integration guides.'
  })

describe('assessEditorialPolicy', () => {
  it('passes a high-confidence description, identity, and category match', () => {
    expect(assess()).toEqual({
      decision: 'auto_publish',
      evidenceIds: ['editorial:passed'],
      reasonCode: 'passed'
    })
  })

  it.each([
    [
      'adult services',
      'Discreet escort services and sexual services for adults.',
      'adult-services'
    ],
    [
      'gambling affiliate spam',
      'Compare casino bonus offers with our gambling affiliate reviews.',
      'gambling-promotion'
    ],
    [
      'academic cheating',
      'Buy an essay from our essay writing service and bypass AI detection.',
      'academic-cheating'
    ],
    [
      'backlink manipulation',
      'Buy backlinks and paid website traffic from our link farm network.',
      'search-manipulation'
    ],
    ['malware distribution', 'Download a phishing kit and credential stealer bundle.', 'malware'],
    [
      'deceptive identity service',
      'Buy fake ID documents and bypass identity verification.',
      'illegal-deceptive-services'
    ]
  ])('rejects established prohibited pattern: %s', (_label, description, evidenceSuffix) => {
    expect(assess({ description })).toEqual({
      decision: 'reject',
      evidenceIds: [`editorial:prohibited:${evidenceSuffix}`],
      reasonCode: 'prohibited_content'
    })
  })

  it.each([
    ['finance', 'Acme is an investment platform for financial planning.', 'finance'],
    ['health', 'Acme is a telehealth platform for medical appointments.', 'health'],
    ['gaming', 'Acme is a video game marketplace for gaming communities.', 'gaming'],
    ['dating', 'Acme is a dating app for meeting compatible people.', 'dating'],
    ['regulated products', 'Acme is a cannabis dispensary marketplace.', 'regulated-products']
  ])(
    'routes an ordinary regulated industry to manual review: %s',
    (_label, description, suffix) => {
      const result = assess({ description })

      expect(result).toMatchObject({
        decision: 'manual_review',
        reasonCode: 'editorial_uncertainty'
      })
      expect(result.evidenceIds).toContain(`editorial:regulated:${suffix}`)
    }
  )

  it.each([
    [
      'healthcare workflow automation for hospitals',
      'healthcare workflow automation for hospitals',
      'health'
    ],
    [
      'banking workflow automation for retail banks',
      'banking workflow automation for retail banks',
      'finance'
    ],
    [
      'gambling workflow automation for online casinos',
      'gambling workflow automation for online casinos',
      'gambling'
    ]
  ])(
    'routes non-adjacent regulated token combinations to manual review: %s',
    (_label, inspected, suffix) => {
      const result = assess(
        { description: `Acme provides ${inspected}.` },
        {
          homepageText: `Acme provides ${inspected}.`,
          llmsText: `# Acme\n\nAcme provides ${inspected}. https://acme.dev/about`
        }
      )

      expect(result.decision).toBe('manual_review')
      expect(result.evidenceIds).toContain(`editorial:regulated:${suffix}`)
    }
  )

  it.each([
    [
      'hospital healthcare',
      'Acme operates a hospital network offering healthcare services.',
      'Acme hospital network and healthcare services for patients.',
      'health'
    ],
    [
      'banking and finance',
      'Acme is an online banking platform for financial services.',
      'Acme online banking platform and financial services.',
      'finance'
    ],
    [
      'ordinary casino',
      'Acme is an online casino platform for table games.',
      'Acme online casino platform with table games.',
      'gambling'
    ],
    [
      'gaming',
      'Acme is a video gaming community and game marketplace.',
      'Acme video gaming community and game marketplace.',
      'gaming'
    ],
    [
      'dating',
      'Acme is a dating platform for meeting compatible people.',
      'Acme dating platform for compatible people.',
      'dating'
    ],
    [
      'regulated products',
      'Acme is an alcohol delivery marketplace for licensed products.',
      'Acme alcohol delivery marketplace for licensed products.',
      'regulated-products'
    ]
  ])(
    'routes inspected ordinary industry content to manual review: %s',
    (_label, description, inspected, suffix) => {
      const result = assess(
        { description },
        {
          homepageText: inspected,
          llmsText: `# Acme\n\n${inspected} https://acme.dev/about`
        }
      )

      expect(result.decision).toBe('manual_review')
      expect(result.evidenceIds).toContain(`editorial:regulated:${suffix}`)
    }
  )

  it('rejects an established inspected adult escort service', () => {
    const inspected = 'Acme is an escort agency offering adult services and booking.'
    const result = assess(
      { description: inspected },
      {
        homepageText: inspected,
        llmsText: `# Acme\n\n${inspected} https://acme.dev/about`
      }
    )

    expect(result).toEqual({
      decision: 'reject',
      evidenceIds: ['editorial:prohibited:adult-services'],
      reasonCode: 'prohibited_content'
    })
  })

  it.each([
    'Casino database schema for a game developer API.',
    'Medical type definitions for a developer SDK.',
    'Finance enum examples for an API documentation generator.'
  ])('does not classify an isolated ambiguous term as regulated or prohibited: %s', description => {
    expect(assess({ description })).toEqual({
      decision: 'auto_publish',
      evidenceIds: ['editorial:passed'],
      reasonCode: 'passed'
    })
  })

  it.each([
    [
      'copied boilerplate',
      'Welcome to our website. Learn more about our products and services.',
      'boilerplate'
    ],
    [
      'keyword stuffing',
      'Acme API tools, API software, API platform, API services, API solutions, API tools.',
      'keyword-stuffing'
    ],
    [
      'excessive superlatives',
      'Acme is the best, number one, world-leading, ultimate developer platform.',
      'superlatives'
    ],
    [
      'first-person sales copy',
      'We offer developer tools and API services. Contact us today for a free consultation.',
      'first-person-sales'
    ]
  ])('routes description-quality concern to manual review: %s', (_label, description, suffix) => {
    const result = assess({ description })

    expect(result).toMatchObject({
      decision: 'manual_review',
      reasonCode: 'editorial_uncertainty'
    })
    expect(result.evidenceIds).toContain(`editorial:quality:${suffix}`)
  })

  it('routes a name and domain mismatch to manual review', () => {
    const result = assess({ name: 'Unrelated Brand', website: 'https://acme.dev' })

    expect(result.evidenceIds).toContain('editorial:identity:name-domain-mismatch')
    expect(result.decision).toBe('manual_review')
  })

  it('does not accept a brand that is only a substring of a domain label', () => {
    const result = assess({ name: 'Press', website: 'https://wordpress.com' })

    expect(result.evidenceIds).toContain('editorial:identity:name-domain-mismatch')
    expect(result.decision).toBe('manual_review')
  })

  it.each([
    ['Dev', 'https://unrelated.dev'],
    ['Cloud', 'https://unrelated.cloud'],
    ['Com', 'https://unrelated.com']
  ])('does not treat public suffix text as brand ownership: %s', (name, website) => {
    const result = assess({ name, website })

    expect(result.evidenceIds).toContain('editorial:identity:name-domain-mismatch')
    expect(result.decision).toBe('manual_review')
  })

  it('accepts a defensible multi-token brand and hyphenated domain label', () => {
    const result = assess({ name: 'Acme Cloud', website: 'https://acme-cloud.com' })

    expect(result).toEqual({
      decision: 'auto_publish',
      evidenceIds: ['editorial:passed'],
      reasonCode: 'passed'
    })
  })

  it('accepts the owner label of a private-suffix tenant', () => {
    const result = assess({ name: 'Acme Project', website: 'https://acme-project.github.io' })

    expect(result).toEqual({
      decision: 'auto_publish',
      evidenceIds: ['editorial:passed'],
      reasonCode: 'passed'
    })
  })

  it('routes an implausible category to manual review without rejecting', () => {
    const result = assess({ category: 'finance-fintech' })

    expect(result).toEqual({
      decision: 'manual_review',
      evidenceIds: ['editorial:category:implausible'],
      reasonCode: 'editorial_uncertainty'
    })
  })

  it('routes an unknown category to manual review without rejecting', () => {
    const result = assess({ category: 'unknown-category' })

    expect(result).toEqual({
      decision: 'manual_review',
      evidenceIds: ['editorial:category:unknown'],
      reasonCode: 'editorial_uncertainty'
    })
  })

  it('routes a category with no conservative keyword match to manual review', () => {
    const result = assess(
      {
        category: 'security-identity',
        description: 'Acme helps teams organize their work.'
      },
      {
        homepageText: 'Acme helps teams organize their work.',
        llmsText: '# Acme\n\nGuides for organizing work across teams and projects.'
      }
    )

    expect(result.evidenceIds).toContain('editorial:category:implausible')
    expect(result.decision).toBe('manual_review')
  })

  it('does not treat category-keyword substrings as semantic matches', () => {
    const result = assess(
      { description: 'Acme guides teams through capital planning.' },
      {
        homepageText: 'Acme guides teams through capital planning.',
        llmsText: '# Acme\n\nGuides for teams making better capital planning decisions.'
      }
    )

    expect(result.evidenceIds).toContain('editorial:category:implausible')
    expect(result.decision).toBe('manual_review')
  })

  it('does not let submitter description claims self-validate category plausibility', () => {
    const result = assess(
      { description: 'Acme provides developer APIs and SDK documentation.' },
      {
        homepageText: 'Acme is an online clothing store for jackets and shoes.',
        llmsText:
          '# Acme\n\nBrowse clothing, jackets, shoes, and seasonal apparel. https://acme.dev/shop'
      }
    )

    expect(result.decision).toBe('manual_review')
    expect(result.evidenceIds).toContain('editorial:category:implausible')
    expect(result.evidenceIds).toContain('editorial:quality:description-content-mismatch')
  })

  it.each([
    ['full-width Unicode', 'ｂｕｙ　ｂａｃｋｌｉｎｋｓ for higher rankings'],
    ['split whitespace', 'Download a phishing\n\tkit for credential theft'],
    ['zero-width formatting', 'buy back\u200Blinks from our network'],
    ['soft hyphen', 'buy back\u00ADlinks from our network'],
    ['invisible separator', 'buy back\u2063links from our network'],
    ['bidi control', 'Download a phi\u202Eshing kit for credential theft'],
    ['visible hyphen', 'buy back-links from our network'],
    ['split prohibited token', 'Download a phish-ing kit for credential theft'],
    ['underscore separator', 'buy back_links from our network'],
    ['hyphenated prohibited phrase', 'Compare casino-bonus offers and reviews']
  ])('normalizes %s before prohibited matching', (_label, description) => {
    expect(assess({ description })).toMatchObject({
      decision: 'reject',
      reasonCode: 'prohibited_content'
    })
  })

  it('returns stable evidence identifiers without leaking the matched text', () => {
    const secretPatternText = 'Buy fake ID documents and bypass identity verification.'
    const result = assess({ description: secretPatternText })

    expect(JSON.stringify(result)).not.toContain(secretPatternText)
    expect(result.evidenceIds).toEqual(['editorial:prohibited:illegal-deceptive-services'])
  })

  it('rejects prohibited content even when other editorial signals are ambiguous', () => {
    const result = assess({
      category: 'unknown-category',
      description: 'We offer casino bonus reviews and gambling affiliate links.'
    })

    expect(result).toEqual({
      decision: 'reject',
      evidenceIds: ['editorial:prohibited:gambling-promotion'],
      reasonCode: 'prohibited_content'
    })
  })
})
