import { describe, expect, it } from 'vitest'
import { normalizeEditorialInputs } from './editorial-normalization.js'

describe('normalizeEditorialInputs', () => {
  it('normalizes a starter and combining mark across the chunk boundary as one sequence', () => {
    const value = `${'a'.repeat(4095)}e\u0301`

    expect(normalizeEditorialInputs([value]).text).toBe(value.normalize('NFKC'))
  })

  it('normalizes a Hangul L V T sequence across the chunk boundary as one sequence', () => {
    const value = `${'a'.repeat(4094)}\u1100\u1161\u11A8`

    expect(normalizeEditorialInputs([value]).text).toBe(value.normalize('NFKC'))
    expect(normalizeEditorialInputs([value]).text.endsWith('각')).toBe(true)
  })

  it('normalizes compatibility Jamo across the chunk boundary as one sequence', () => {
    const value = `${'a'.repeat(4094)}\u3131\u314Fx`

    expect(normalizeEditorialInputs([value]).text).toBe(value.normalize('NFKC'))
    expect(normalizeEditorialInputs([value]).text.endsWith('가x')).toBe(true)
  })

  it.each([
    ['homepage', 512 * 1024],
    ['llms', 1024 * 1024]
  ])('accepts ASCII at the exact %s technical character budget', (_label, maximumCharacters) => {
    expect(
      normalizeEditorialInputs(['a'.repeat(maximumCharacters)], { maximumCharacters }).overflow
    ).toBe(false)
  })
})
