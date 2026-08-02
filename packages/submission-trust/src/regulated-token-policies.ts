interface TokenCombinationPolicy {
  readonly contextTokens: readonly string[]
  readonly evidenceId: string
  readonly industryTokens: readonly string[]
}

const TOKEN_ALIASES: Readonly<Record<string, string>> = {
  applications: 'application',
  apis: 'api',
  banks: 'bank',
  casinos: 'casino',
  docs: 'documentation',
  guides: 'guide',
  hospitals: 'hospital',
  libraries: 'library',
  sdks: 'sdk',
  services: 'service',
  tooling: 'tool',
  tools: 'tool'
}

const REGULATED_TOKEN_POLICIES: readonly TokenCombinationPolicy[] = [
  {
    contextTokens: [
      'appointment',
      'care',
      'clinic',
      'healthcare',
      'hospital',
      'network',
      'patient',
      'platform',
      'provider',
      'service'
    ],
    evidenceId: 'editorial:regulated:health',
    industryTokens: ['health', 'healthcare', 'hospital', 'medical', 'pharmacy', 'telehealth']
  },
  {
    contextTokens: [
      'bank',
      'commercial',
      'consumer',
      'credit',
      'exchange',
      'institution',
      'online',
      'payment',
      'planning',
      'platform',
      'provider',
      'retail',
      'service',
      'trading'
    ],
    evidenceId: 'editorial:regulated:finance',
    industryTokens: [
      'bank',
      'banking',
      'crypto',
      'finance',
      'financial',
      'fintech',
      'investment',
      'loan'
    ]
  },
  {
    contextTokens: ['casino', 'online', 'platform', 'service', 'sports', 'table', 'website'],
    evidenceId: 'editorial:regulated:gambling',
    industryTokens: ['betting', 'casino', 'gambling']
  },
  {
    contextTokens: ['community', 'marketplace', 'platform', 'service', 'studio', 'video'],
    evidenceId: 'editorial:regulated:gaming',
    industryTokens: ['gaming']
  },
  {
    contextTokens: ['studio', 'video'],
    evidenceId: 'editorial:regulated:gaming',
    industryTokens: ['game']
  },
  {
    contextTokens: ['app', 'community', 'match', 'people', 'platform', 'service'],
    evidenceId: 'editorial:regulated:dating',
    industryTokens: ['dating']
  },
  {
    contextTokens: ['delivery', 'marketplace', 'store'],
    evidenceId: 'editorial:regulated:regulated-products',
    industryTokens: ['alcohol']
  },
  {
    contextTokens: ['dispensary', 'marketplace', 'product'],
    evidenceId: 'editorial:regulated:regulated-products',
    industryTokens: ['cannabis']
  },
  {
    contextTokens: ['marketplace', 'store'],
    evidenceId: 'editorial:regulated:regulated-products',
    industryTokens: ['firearm']
  },
  {
    contextTokens: ['product'],
    evidenceId: 'editorial:regulated:regulated-products',
    industryTokens: ['regulated']
  },
  {
    contextTokens: ['shop', 'store'],
    evidenceId: 'editorial:regulated:regulated-products',
    industryTokens: ['vape']
  }
]

const hasTokenCombination = (
  tokens: ReadonlySet<string>,
  industryTokens: readonly string[],
  contextTokens: readonly string[]
): boolean => {
  const matchedIndustryTokens = industryTokens.filter(token => tokens.has(token))
  return matchedIndustryTokens.some(industryToken =>
    contextTokens.some(contextToken => contextToken !== industryToken && tokens.has(contextToken))
  )
}

const POLICY_TOKEN_VOCABULARY = new Set(
  REGULATED_TOKEN_POLICIES.flatMap(policy => [...policy.contextTokens, ...policy.industryTokens])
)

const collectPolicyTokens = (texts: readonly string[]): ReadonlySet<string> => {
  const tokens = new Set<string>()
  for (const text of texts) {
    for (const match of text.matchAll(/\S+/gu)) {
      const token = canonicalEditorialToken(match[0])
      if (POLICY_TOKEN_VOCABULARY.has(token)) tokens.add(token)
      if (tokens.size === POLICY_TOKEN_VOCABULARY.size) return tokens
    }
  }
  return tokens
}

/** Returns the canonical form used for editorial token comparisons. */
export const canonicalEditorialToken = (token: string): string => TOKEN_ALIASES[token] ?? token

/** Returns stable evidence identifiers for conservative regulated-industry token combinations. */
export const regulatedEvidence = (texts: readonly string[]): string[] => {
  const tokens = collectPolicyTokens(texts)
  return [
    ...new Set(
      REGULATED_TOKEN_POLICIES.filter(policy =>
        hasTokenCombination(tokens, policy.industryTokens, policy.contextTokens)
      ).map(policy => policy.evidenceId)
    )
  ]
}
