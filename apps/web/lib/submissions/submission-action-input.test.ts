import { parseSubmissionActionInput } from './submission-action-input'

const payload = (mdxContent?: string): FormData => {
  const form = new FormData()
  for (const [name, value] of Object.entries({
    category: 'developer-tools',
    description:
      'A useful developer platform with clear public documentation for teams building software.',
    llmsUrl: 'https://example.com/llms.txt',
    name: 'Example',
    publishedAt: '2026-08-02',
    website: 'https://example.com/'
  }))
    form.set(name, value)
  if (mdxContent !== undefined) form.set('mdxContent', mdxContent)
  return form
}

describe('additional content action input', () => {
  it('accepts absent and empty content without adding a field', () => {
    for (const value of [undefined, '', ' \r\n ']) {
      const result = parseSubmissionActionInput(payload(value))
      expect(result.ok).toBe(true)
      if (result.ok) expect(result.fields).not.toHaveProperty('mdxContent')
    }
  })

  it('keeps Markdown structure while neutralizing executable syntax', () => {
    const result = parseSubmissionActionInput(
      payload('## Details\r\n\r\n- **API** documentation\r\n\r\n{danger()}')
    )
    expect(result.ok).toBe(true)
    if (result.ok)
      expect(result.fields.mdxContent).toBe(
        '## Details\n\n- **API** documentation\n\n\\{danger()\\}'
      )
  })

  it.each(['a'.repeat(5001), '[Bad](javascript:alert(1))', '[Bad](//evil.com)'])(
    'rejects invalid content with a useful field-specific error',
    value => {
      expect(parseSubmissionActionInput(payload(value))).toMatchObject({
        ok: false,
        message: expect.stringContaining('Additional Content')
      })
    }
  )
})
