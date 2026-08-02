/** Result of a bounded editorial normalization operation. */
export interface BoundedNormalizedText {
  readonly overflow: boolean
  readonly text: string
}

interface EditorialNormalizationOptions {
  readonly compactSeparators?: boolean
  readonly securityMatch?: boolean
}

const MAX_NORMALIZED_TEXT_CHARACTERS = 1_100_000
const NORMALIZATION_CHUNK_CHARACTERS = 4096
const SECURITY_TOKEN_ALIASES: Readonly<Record<string, string>> = {
  bonuses: 'bonus',
  downloads: 'download',
  kits: 'kit',
  packages: 'package'
}
const SECURITY_ALIAS_PATTERN = /\b(?:bonuses|downloads|kits|packages)\b/gu

const canonicalizeSecurityAliases = (text: string): string =>
  text.replace(SECURITY_ALIAS_PATTERN, token => SECURITY_TOKEN_ALIASES[token] ?? token)

const chunkEnd = (value: string, offset: number): number => {
  const proposedEnd = Math.min(offset + NORMALIZATION_CHUNK_CHARACTERS, value.length)
  if (proposedEnd === value.length) return proposedEnd
  const lastCodeUnit = value.charCodeAt(proposedEnd - 1)
  return lastCodeUnit >= 0xd800 && lastCodeUnit <= 0xdbff ? proposedEnd - 1 : proposedEnd
}

/**
 * Normalizes one or more inputs without allowing compatibility expansion to
 * exceed the editorial memory budget.
 */
export const normalizeEditorialInputs = (
  values: readonly string[],
  options: EditorialNormalizationOptions = {}
): BoundedNormalizedText => {
  const inputCharacters = values.reduce((total, value) => total + value.length, 0)
  if (inputCharacters > MAX_NORMALIZED_TEXT_CHARACTERS) {
    return { overflow: true, text: '' }
  }

  const normalizedChunks: string[] = []
  let normalizedCharacters = 0
  const normalizationForm = options.securityMatch ? 'NFKD' : 'NFKC'

  for (const value of values) {
    if (normalizedCharacters > 0) {
      normalizedChunks.push(' ')
      normalizedCharacters += 1
    }
    for (let offset = 0; offset < value.length; ) {
      const end = chunkEnd(value, offset)
      const normalizedChunk = value.slice(offset, end).normalize(normalizationForm)
      normalizedCharacters += normalizedChunk.length
      if (normalizedCharacters > MAX_NORMALIZED_TEXT_CHARACTERS) {
        return { overflow: true, text: '' }
      }
      normalizedChunks.push(normalizedChunk)
      offset = end
    }
  }

  let canonicalCharacters = 0
  for (let index = 0; index < normalizedChunks.length; index += 1) {
    const lowercasedChunk = normalizedChunks[index]?.toLocaleLowerCase('en-US') ?? ''
    canonicalCharacters += lowercasedChunk.length
    if (canonicalCharacters > MAX_NORMALIZED_TEXT_CHARACTERS) {
      return { overflow: true, text: '' }
    }
    normalizedChunks[index] = lowercasedChunk
  }
  const normalized = normalizedChunks.join('').replace(/\p{Cf}+/gu, '')
  const markNormalized = options.securityMatch ? normalized.replace(/\p{M}+/gu, '') : normalized
  const compactSeparators = options.compactSeparators || options.securityMatch
  const canonicalized = compactSeparators
    ? markNormalized.replace(/([\p{L}\p{N}])[\p{P}\p{S}]+(?=[\p{L}\p{N}])/gu, '$1')
    : markNormalized
  const text = canonicalized
    .replace(/[\p{P}\p{S}]+/gu, ' ')
    .replace(/\s+/gu, ' ')
    .trim()

  return {
    overflow: false,
    text: options.securityMatch ? canonicalizeSecurityAliases(text) : text
  }
}
