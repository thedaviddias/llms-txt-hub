import { describe, expect, it } from 'vitest'
import { canonicalEditorialToken } from './editorial-token-aliases.js'

describe('canonicalEditorialToken', () => {
  it.each([
    ['botnets', 'botnet'],
    ['consumers', 'consumer'],
    ['credentials', 'credential'],
    ['domains', 'domain'],
    ['escorts', 'escort'],
    ['identities', 'identity'],
    ['investments', 'investment'],
    ['rankings', 'ranking']
  ])('canonicalizes an audited policy noun without generic stemming: %s', (token, expected) => {
    expect(canonicalEditorialToken(token)).toBe(expected)
  })

  it('leaves an unlisted plural unchanged', () => {
    expect(canonicalEditorialToken('analyses')).toBe('analyses')
  })
})
