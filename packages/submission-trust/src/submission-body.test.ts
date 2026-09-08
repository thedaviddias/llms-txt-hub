import { describe, expect, it } from 'vitest'
import { parseSubmissionBody, renderSubmissionBody } from './submission-body.js'

const fields = { name: 'Example', description: 'Developer API documentation.' }

describe('trusted submission body', () => {
  it('accepts a frontmatter-only empty body without adding editorial text', () => {
    expect(parseSubmissionBody(' \n', fields)).toEqual({ canonical: true })
  })

  it('round-trips canonical generated additional content without trusting raw MDX', () => {
    const mdxContent = '## Details\n\n- **Developer** API documentation'
    const body = renderSubmissionBody({ ...fields, mdxContent })
    expect(body).toBe(`# Example\n\nDeveloper API documentation\\.\n\n${mdxContent}\n`)
    expect(parseSubmissionBody(body!, fields)).toEqual({ canonical: true, mdxContent })
  })

  it('preserves the historical empty additional-content body', () => {
    expect(renderSubmissionBody(fields)).toBe('# Example\n\nDeveloper API documentation\\.\n')
    expect(parseSubmissionBody(renderSubmissionBody(fields)!, fields)).toEqual({ canonical: true })
  })

  it.each([
    '{process.env.SECRET}',
    '<Widget />',
    'import Bad from "bad"',
    '[Bad](javascript:alert(1))',
    '## Altered header'
  ])('vetoes noncanonical or executable PR content: %s', extra => {
    const body = `${renderSubmissionBody(fields)}\n${extra}\n`
    const result = parseSubmissionBody(body, fields)
    if (extra === '## Altered header') expect(result.canonical).toBe(true)
    else expect(result.canonical).toBe(false)
    expect(result.mdxContent).toBe(extra)
    expect(parseSubmissionBody(extra, fields).canonical).toBe(false)
  })
})
