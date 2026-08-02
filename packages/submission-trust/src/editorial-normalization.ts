import { canonicalizeEditorialTokens } from '#editorial-token-aliases'

/** Result of a bounded editorial normalization operation. */
export interface BoundedNormalizedText {
  readonly overflow: boolean
  readonly text: string
}

interface EditorialNormalizationOptions {
  readonly compactSeparators?: boolean
  readonly maximumCharacters?: number
  readonly securityMatch?: boolean
}

interface NormalizationAccumulator {
  characters: number
  readonly chunks: string[]
}

const DEFAULT_MAXIMUM_CHARACTERS = 1_100_000
const ABSOLUTE_MAXIMUM_INPUT_CHARACTERS = 1_100_000
const TOKEN_SEPARATOR = '\uE000'
const SECURITY_UNSAFE_CATEGORY = /[\p{Cc}\p{Cs}\p{Co}\p{Cn}]/gu
const CONTROL_CHARACTER = /\p{Cc}/u
const WHITESPACE_CHARACTER = /\s/u

const hasUnsafeSecurityCharacter = (value: string): boolean => {
  for (const match of value.matchAll(SECURITY_UNSAFE_CATEGORY)) {
    const character = match[0]
    if (!CONTROL_CHARACTER.test(character) || !WHITESPACE_CHARACTER.test(character)) return true
  }
  return false
}

const appendNormalizedSequence = (
  accumulator: NormalizationAccumulator,
  value: string,
  normalizationForm: string,
  maximumCharacters: number
): boolean => {
  if (value.length === 0) return true
  const normalized = value.normalize(normalizationForm)
  if (accumulator.characters + normalized.length > maximumCharacters) return false
  accumulator.chunks.push(normalized)
  accumulator.characters += normalized.length
  return true
}

/**
 * Normalizes one or more inputs without allowing compatibility expansion to
 * exceed the editorial memory budget.
 */
export const normalizeEditorialInputs = (
  values: readonly string[],
  options: EditorialNormalizationOptions = {}
): BoundedNormalizedText => {
  const maximumCharacters = options.maximumCharacters ?? DEFAULT_MAXIMUM_CHARACTERS
  const inputCharacters = values.reduce((total, value) => total + value.length, 0)
  if (inputCharacters > maximumCharacters || inputCharacters > ABSOLUTE_MAXIMUM_INPUT_CHARACTERS) {
    return { overflow: true, text: '' }
  }

  const accumulator: NormalizationAccumulator = { characters: 0, chunks: [] }
  const normalizationForm = options.securityMatch ? 'NFKD' : 'NFKC'

  for (const value of values) {
    if (options.securityMatch && hasUnsafeSecurityCharacter(value)) {
      return { overflow: true, text: '' }
    }
    if (accumulator.characters > 0) {
      if (accumulator.characters + 1 > maximumCharacters) {
        return { overflow: true, text: '' }
      }
      accumulator.chunks.push(' ')
      accumulator.characters += 1
    }
    // Native whole-value normalization is exact for every Unicode boundary.
    // The absolute raw-input cap fixes temporary memory, and the normalized
    // value is retained only when it remains inside the caller's output cap.
    if (!appendNormalizedSequence(accumulator, value, normalizationForm, maximumCharacters)) {
      return { overflow: true, text: '' }
    }
  }

  let canonicalCharacters = 0
  for (let index = 0; index < accumulator.chunks.length; index += 1) {
    const lowercasedChunk = accumulator.chunks[index]?.toLocaleLowerCase('en-US') ?? ''
    canonicalCharacters += lowercasedChunk.length
    if (canonicalCharacters > maximumCharacters) {
      return { overflow: true, text: '' }
    }
    accumulator.chunks[index] = lowercasedChunk
  }
  const normalized = accumulator.chunks.join('').replace(/\p{Cf}+/gu, '')
  const markNormalized = options.securityMatch ? normalized.replace(/\p{M}+/gu, '') : normalized
  const tokenBoundaries = markNormalized.replace(/[\p{P}\p{S}]+/gu, TOKEN_SEPARATOR)
  const aliased = options.securityMatch
    ? canonicalizeEditorialTokens(tokenBoundaries)
    : tokenBoundaries
  const compactSeparators = options.compactSeparators || options.securityMatch
  const canonicalized = compactSeparators
    ? aliased.replace(/([\p{L}\p{N}])\uE000+(?=[\p{L}\p{N}])/gu, '$1')
    : aliased
  const text = canonicalized
    .replace(/\uE000+/gu, ' ')
    .replace(/\s+/gu, ' ')
    .trim()

  return {
    overflow: false,
    text
  }
}
