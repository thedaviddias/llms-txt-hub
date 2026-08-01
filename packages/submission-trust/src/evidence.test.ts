import { describe, expect, it } from 'vitest'

import { sanitizeAssessmentEvidenceDetails } from './evidence.js'

describe('sanitizeAssessmentEvidenceDetails', () => {
  it('examines only a bounded prefix of adversarial evidence arrays', () => {
    const threatTypes = new Array<unknown>(1_000)
    threatTypes[0] = 'MALWARE'
    Object.defineProperty(threatTypes, 32, {
      get() {
        throw new Error('unbounded threat traversal')
      }
    })
    const redirectHosts = new Array<unknown>(1_000)
    redirectHosts[0] = 'example.com'
    Object.defineProperty(redirectHosts, 32, {
      get() {
        throw new Error('unbounded redirect traversal')
      }
    })

    expect(sanitizeAssessmentEvidenceDetails({ redirectHosts, threatTypes })).toMatchObject({
      redirectHosts: ['example.com'],
      threatTypes: ['MALWARE']
    })
  })

  it('drops control-bearing printable fields and malformed tokens', () => {
    expect(
      sanitizeAssessmentEvidenceDetails({
        contentType: 'text/plain\0private',
        evidenceId: 'safe-id\nprivate',
        threatTypes: ['MALWARE', 'BAD\u0001TOKEN']
      })
    ).toEqual({ threatTypes: ['MALWARE'] })
  })

  it('bounds very long strings before normalizing them', () => {
    const details = sanitizeAssessmentEvidenceDetails({
      contentType: `text/plain;${'a'.repeat(1_000_000)}`,
      evidenceId: `evidence-${'b'.repeat(1_000_000)}`
    })

    expect(details.contentType).toHaveLength(128)
    expect(details.evidenceId).toHaveLength(128)
  })
})
