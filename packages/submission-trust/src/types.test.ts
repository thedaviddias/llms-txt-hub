import { describe, expect, it } from 'vitest'

import { mergeSubmissionDecisions } from './types.js'

describe('mergeSubmissionDecisions', () => {
  it.each([
    [['auto_publish', 'manual_review'], 'manual_review'],
    [['manual_review', 'retry_later'], 'retry_later'],
    [['retry_later', 'reject'], 'reject']
  ] as const)('merges %j as %s', (decisions, expected) => {
    expect(mergeSubmissionDecisions(decisions)).toBe(expected)
  })

  it('fails closed when no decisions are available', () => {
    expect(mergeSubmissionDecisions([])).toBe('retry_later')
  })
})
