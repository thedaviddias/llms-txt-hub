import { getDomainWithoutSuffix } from 'tldts'
import { normalizeEditorialInputs } from './editorial-normalization.js'
import { canonicalEditorialToken, regulatedEvidence } from './regulated-token-policies.js'
import type { SubmissionFields } from './types.js'

/** Category metadata projected from the application's canonical category list. */
export interface EditorialCategoryDescriptor {
  readonly description: string
  readonly name: string
  readonly slug: string
}

/** Bounded text and metadata used by the deterministic editorial classifier. */
export interface EditorialPolicyInput {
  readonly categories: readonly EditorialCategoryDescriptor[]
  readonly fields: SubmissionFields
  readonly homepageText: string
  readonly llmsFullText?: string
  readonly llmsText: string
}

/** Stable editorial outcome that can be merged with technical assessment checks. */
export type EditorialPolicyResult =
  | {
      readonly decision: 'auto_publish'
      readonly evidenceIds: readonly ['editorial:passed']
      readonly reasonCode: 'passed'
    }
  | {
      readonly decision: 'manual_review'
      readonly evidenceIds: readonly string[]
      readonly reasonCode: 'editorial_uncertainty'
    }
  | {
      readonly decision: 'reject'
      readonly evidenceIds: readonly string[]
      readonly reasonCode: 'prohibited_content'
    }

interface PhrasePolicy {
  readonly evidenceId: string
  readonly phrases: readonly string[]
}

const PROHIBITED_POLICIES: readonly PhrasePolicy[] = [
  {
    evidenceId: 'editorial:prohibited:adult-services',
    phrases: [
      'adult escort',
      'adult entertainment',
      'adult service',
      'adult services',
      'escort agency',
      'escort booking',
      'escort service',
      'escort services',
      'sexual service',
      'sexual services',
      'live sex cam',
      'porn site',
      'xxx video'
    ]
  },
  {
    evidenceId: 'editorial:prohibited:gambling-promotion',
    phrases: [
      'betting affiliate',
      'betting bonus',
      'betting review',
      'casino affiliate',
      'casino bonus',
      'casino review',
      'gambling affiliate',
      'gambling bonus',
      'gambling review'
    ]
  },
  {
    evidenceId: 'editorial:prohibited:academic-cheating',
    phrases: [
      'academic cheating',
      'ai detector bypass',
      'buy an essay',
      'buy essay',
      'bypass ai detection',
      'do my homework',
      'essay writing service',
      'undetectable ai essay',
      'write my essay'
    ]
  },
  {
    evidenceId: 'editorial:prohibited:search-manipulation',
    phrases: [
      'backlink package',
      'buy backlinks',
      'buy website traffic',
      'domain authority links',
      'link farm',
      'paid backlinks',
      'paid website traffic',
      'search ranking manipulation'
    ]
  },
  {
    evidenceId: 'editorial:prohibited:malware',
    phrases: [
      'botnet rental',
      'credential stealer',
      'malware download',
      'phishing kit',
      'ransomware service'
    ]
  },
  {
    evidenceId: 'editorial:prohibited:illegal-deceptive-services',
    phrases: [
      'buy fake id',
      'bypass identity verification',
      'counterfeit document',
      'counterfeit documents',
      'fake id document',
      'fake id documents',
      'fake id service',
      'guaranteed loan approval',
      'guaranteed medical cure',
      'stolen credit card'
    ]
  }
]

const CATEGORY_KEYWORDS: Readonly<Record<string, readonly string[]>> = {
  'agency-services': ['agency', 'consultancy', 'consulting service', 'service provider'],
  'ai-ml': ['ai model', 'artificial intelligence', 'large language model', 'machine learning'],
  'automation-workflow': ['automation', 'integration platform', 'productivity tool', 'workflow'],
  'business-operations': [
    'business management',
    'enterprise tool',
    'operations platform',
    'project management'
  ],
  'content-media': ['content management', 'media platform', 'publishing platform'],
  'data-analytics': ['analytics', 'business intelligence', 'data processing', 'database'],
  'developer-tools': [
    'api',
    'developer',
    'framework',
    'ide',
    'library',
    'sdk',
    'software development'
  ],
  'ecommerce-retail': ['e commerce', 'marketplace', 'online store', 'retail platform'],
  'finance-fintech': ['financial service', 'fintech', 'payment platform'],
  'infrastructure-cloud': ['cloud platform', 'container', 'devops', 'hosting', 'infrastructure'],
  international: ['global website', 'international website', 'multilingual'],
  'marketing-sales': ['crm', 'customer engagement', 'marketing platform', 'sales platform'],
  personal: ['personal blog', 'personal website', 'portfolio'],
  'security-identity': ['authentication', 'compliance', 'encryption', 'identity', 'security tool']
}

const BOILERPLATE_PHRASES = [
  'a brief description of your website',
  'lorem ipsum',
  'this is a website',
  'welcome to our website',
  'your website description'
] as const
const FIRST_PERSON_SALES_PHRASES = [
  'buy now',
  'contact us',
  'free consultation',
  'get a quote',
  'our services',
  'we offer',
  'we provide'
] as const
const SUPERLATIVE_PHRASES = [
  'best',
  'leading',
  'most trusted',
  'number one',
  'top rated',
  'ultimate',
  'unbeatable',
  'world class',
  'world leading'
] as const
const NAME_STOP_WORDS = new Set(['api', 'app', 'company', 'corp', 'docs', 'inc', 'llc', 'the'])
const KEYWORD_STOP_WORDS = new Set([
  'a',
  'an',
  'and',
  'are',
  'for',
  'from',
  'in',
  'is',
  'of',
  'on',
  'our',
  'the',
  'to',
  'with'
])
const DESCRIPTION_STOP_WORDS = new Set([
  ...KEYWORD_STOP_WORDS,
  'build',
  'building',
  'help',
  'helps',
  'offer',
  'offering',
  'offers',
  'provide',
  'provides'
])
const MAX_BRAND_TOKENS = 16
const MAX_DESCRIPTION_TOKENS = 128
const MAX_KEYWORD_STUFFING_TOKENS = 256

const hasPhrase = (text: string, phrase: string): boolean => ` ${text} `.includes(` ${phrase} `)

const hasSecurityPhrase = (text: string, phrase: string): boolean =>
  hasPhrase(text, phrase) || hasPhrase(text, phrase.replaceAll(' ', ''))

const matchingEvidence = (text: string, policies: readonly PhrasePolicy[]): string[] => {
  const matches: string[] = []
  for (const policy of policies) {
    if (policy.phrases.some(phrase => hasSecurityPhrase(text, phrase))) {
      matches.push(policy.evidenceId)
    }
  }
  return matches
}

const hasKeywordStuffing = (description: string): boolean => {
  const counts = new Map<string, number>()
  let tokenCount = 0
  for (const match of description.matchAll(/\S+/gu)) {
    const token = match[0]
    if (token.length < 3 || KEYWORD_STOP_WORDS.has(token)) continue
    tokenCount += 1
    counts.set(token, (counts.get(token) ?? 0) + 1)
    if (tokenCount === MAX_KEYWORD_STUFFING_TOKENS) break
  }
  if (tokenCount < 6) return false
  for (const count of counts.values()) {
    if (count >= 4 && count / tokenCount >= 0.25) return true
  }
  return false
}

const descriptionEvidence = (description: string): string[] => {
  const matches: string[] = []
  if (BOILERPLATE_PHRASES.some(phrase => hasPhrase(description, phrase))) {
    matches.push('editorial:quality:boilerplate')
  }
  if (hasKeywordStuffing(description)) {
    matches.push('editorial:quality:keyword-stuffing')
  }
  const superlativeCount = SUPERLATIVE_PHRASES.filter(phrase =>
    hasPhrase(description, phrase)
  ).length
  if (superlativeCount >= 2) {
    matches.push('editorial:quality:superlatives')
  }
  if (FIRST_PERSON_SALES_PHRASES.some(phrase => hasPhrase(description, phrase))) {
    matches.push('editorial:quality:first-person-sales')
  }
  return matches
}

const meaningfulTokens = (
  text: string,
  excludedTokens: ReadonlySet<string>,
  stopWords: ReadonlySet<string>,
  maximumTokens: number
): string[] => {
  const tokens: string[] = []
  const seenTokens = new Set<string>()
  for (const match of text.matchAll(/\S+/gu)) {
    const token = canonicalEditorialToken(match[0])
    if (
      token.length < 3 ||
      stopWords.has(token) ||
      excludedTokens.has(token) ||
      seenTokens.has(token)
    ) {
      continue
    }
    tokens.push(token)
    seenTokens.add(token)
    if (tokens.length === maximumTokens) break
  }
  return tokens
}

const descriptionMatchesInspectedContent = (
  description: string,
  inspectedText: string,
  name: string
): boolean => {
  const nameTokens = new Set(
    meaningfulTokens(name, new Set<string>(), NAME_STOP_WORDS, MAX_BRAND_TOKENS)
  )
  const descriptionTokens = meaningfulTokens(
    description,
    nameTokens,
    DESCRIPTION_STOP_WORDS,
    MAX_DESCRIPTION_TOKENS
  )
  if (descriptionTokens.length === 0) return false
  const descriptionTokenSet = new Set(descriptionTokens)
  const overlappingTokens = new Set<string>()
  for (const match of inspectedText.matchAll(/\S+/gu)) {
    const token = canonicalEditorialToken(match[0])
    if (descriptionTokenSet.has(token)) overlappingTokens.add(token)
    if (overlappingTokens.size === descriptionTokenSet.size) break
  }
  const requiredOverlap =
    descriptionTokens.length === 1 ? 1 : Math.max(2, Math.ceil(descriptionTokens.length * 0.25))
  return overlappingTokens.size >= requiredOverlap
}

const nameMatchesDomain = (name: string, website: string): boolean => {
  let hostname: string
  try {
    hostname = new URL(website).hostname.toLocaleLowerCase('en-US').replace(/^www\./u, '')
  } catch {
    return false
  }
  const ownerLabel = getDomainWithoutSuffix(hostname, {
    allowPrivateDomains: true,
    extractHostname: false
  })
  const nameTokens = meaningfulTokens(name, new Set<string>(), NAME_STOP_WORDS, MAX_BRAND_TOKENS)
  if (nameTokens.length === 0 || !ownerLabel) return false
  const compactBrand = nameTokens.join('')
  const normalizedOwnerLabel = normalizeEditorialInputs([ownerLabel], {
    compactSeparators: true
  })
  return !normalizedOwnerLabel.overflow && normalizedOwnerLabel.text === compactBrand
}

const normalizedOverflowResult = (): EditorialPolicyResult => ({
  decision: 'manual_review',
  evidenceIds: ['editorial:limits:normalized-text-overflow'],
  reasonCode: 'editorial_uncertainty'
})

const categoryEvidence = (
  categories: readonly EditorialCategoryDescriptor[],
  category: string,
  text: string
): string | undefined => {
  if (!categories.some(descriptor => descriptor.slug === category)) {
    return 'editorial:category:unknown'
  }
  const keywords = CATEGORY_KEYWORDS[category]
  if (!keywords?.some(keyword => hasPhrase(text, keyword))) {
    return 'editorial:category:implausible'
  }
  return undefined
}

/**
 * Classifies prohibited patterns and conservative editorial ambiguity without
 * exposing the underlying pattern table or promoting any technical decision.
 */
export const assessEditorialPolicy = (input: EditorialPolicyInput): EditorialPolicyResult => {
  const normalizedDescription = normalizeEditorialInputs([input.fields.description])
  const normalizedName = normalizeEditorialInputs([input.fields.name])
  const normalizedInspectedText = normalizeEditorialInputs([
    input.homepageText,
    input.llmsText,
    input.llmsFullText ?? ''
  ])
  if (
    normalizedDescription.overflow ||
    normalizedName.overflow ||
    normalizedInspectedText.overflow
  ) {
    return normalizedOverflowResult()
  }
  const securityText = normalizeEditorialInputs(
    [
      input.fields.name,
      input.fields.description,
      input.homepageText,
      input.llmsText,
      input.llmsFullText ?? ''
    ],
    { securityMatch: true }
  )
  if (securityText.overflow) return normalizedOverflowResult()

  const description = normalizedDescription.text
  const name = normalizedName.text
  const inspectedText = normalizedInspectedText.text
  const prohibitedEvidence = matchingEvidence(securityText.text, PROHIBITED_POLICIES)
  if (prohibitedEvidence.length > 0) {
    return {
      decision: 'reject',
      evidenceIds: prohibitedEvidence,
      reasonCode: 'prohibited_content'
    }
  }

  const manualEvidence = [
    ...regulatedEvidence([name, description, inspectedText]),
    ...descriptionEvidence(description)
  ]
  if (!descriptionMatchesInspectedContent(description, inspectedText, name)) {
    manualEvidence.push('editorial:quality:description-content-mismatch')
  }
  if (!nameMatchesDomain(name, input.fields.website)) {
    manualEvidence.push('editorial:identity:name-domain-mismatch')
  }
  const categoryConcern = categoryEvidence(input.categories, input.fields.category, inspectedText)
  if (categoryConcern) manualEvidence.push(categoryConcern)

  if (manualEvidence.length > 0) {
    return {
      decision: 'manual_review',
      evidenceIds: [...new Set(manualEvidence)],
      reasonCode: 'editorial_uncertainty'
    }
  }
  return {
    decision: 'auto_publish',
    evidenceIds: ['editorial:passed'],
    reasonCode: 'passed'
  }
}
