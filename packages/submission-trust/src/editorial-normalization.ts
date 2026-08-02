import { canonicalizeEditorialTokens } from './editorial-token-aliases.js'

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
const NORMALIZATION_CHUNK_CHARACTERS = 4096
const TOKEN_SEPARATOR = '\uE000'
const TRAILING_NORMALIZATION_SEQUENCE = /[^\p{M}\p{Cf}][\p{M}\p{Cf}]*$/u

const chunkEnd = (value: string, offset: number): number => {
  const proposedEnd = Math.min(offset + NORMALIZATION_CHUNK_CHARACTERS, value.length)
  if (proposedEnd === value.length) return proposedEnd
  const lastCodeUnit = value.charCodeAt(proposedEnd - 1)
  return lastCodeUnit >= 0xd800 && lastCodeUnit <= 0xdbff ? proposedEnd - 1 : proposedEnd
}

const trailingNormalizationSequenceStart = (value: string): number =>
  value.match(TRAILING_NORMALIZATION_SEQUENCE)?.index ?? 0

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
  if (inputCharacters > maximumCharacters) {
    return { overflow: true, text: '' }
  }

  const accumulator: NormalizationAccumulator = { characters: 0, chunks: [] }
  const normalizationForm = options.securityMatch ? 'NFKD' : 'NFKC'

  for (const value of values) {
    if (accumulator.characters > 0) {
      if (accumulator.characters + 1 > maximumCharacters) {
        return { overflow: true, text: '' }
      }
      accumulator.chunks.push(' ')
      accumulator.characters += 1
    }
    let carry = ''
    for (let offset = 0; offset < value.length; ) {
      const end = chunkEnd(value, offset)
      const combined = carry + value.slice(offset, end)
      const finalChunk = end === value.length
      const carryStart = finalChunk ? combined.length : trailingNormalizationSequenceStart(combined)
      const sequence = finalChunk ? combined : combined.slice(0, carryStart)
      carry = finalChunk ? '' : combined.slice(carryStart)
      if (!appendNormalizedSequence(accumulator, sequence, normalizationForm, maximumCharacters)) {
        return { overflow: true, text: '' }
      }
      offset = end
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
