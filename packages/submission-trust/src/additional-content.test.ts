import remarkParse from 'remark-parse'
import { unified } from 'unified'
import { describe, expect, it } from 'vitest'
import { normalizeAdditionalContent } from './additional-content.js'

describe('normalizeAdditionalContent', () => {
  it.each(['**b**__d__', '`x`https://example.com', '*b*_d_', '**a**__b__**c**'])(
    'preserves adjacent inline semantics in one canonical serialization: %s',
    source => {
      const normalized = normalizeAdditionalContent(source)
      expect(normalized).not.toBeNull()
      expect(normalizeAdditionalContent(normalized?.markdown)).toEqual(normalized)
    }
  )

  it('marks normalized HTTPS link forms as unassessed destinations', () => {
    const normalized = normalizeAdditionalContent('[Guide](https:unassessed.com/docs)')
    expect(normalized?.hasUnassessedDestinations).toBe(true)
  })

  it.each([
    'https://example.com/docs#getting-started',
    'https://example.com/docs#/guides/{api}?a=1&b=2'
  ])('preserves HTTPS anchors and fragment routes: %s', destination => {
    const normalized = normalizeAdditionalContent(`[Guide](${destination})`)
    const paragraph = unified()
      .use(remarkParse)
      .parse(normalized?.markdown ?? '').children[0]
    if (paragraph?.type !== 'paragraph') throw new Error('Expected a Markdown paragraph')
    expect(paragraph.children[0]).toMatchObject({ type: 'link', url: destination })
    expect(normalizeAdditionalContent(normalized?.markdown)).toEqual(normalized)
  })

  it('retains useful Markdown and has a stable canonical representation', () => {
    const value =
      '## Details\n\n- **Developer** API documentation\n- *Guides* and `const value = { safe: true }`\n\n```js\nexport const value = <div>{process.env.SECRET}</div>\n```'
    const result = normalizeAdditionalContent(value)
    expect(result?.markdown).toBe(value)
    expect(normalizeAdditionalContent(result?.markdown)).toEqual(result)
  })

  it.each([
    '<script>alert(1)</script>',
    '<Widget onClick={() => alert(1)} />',
    '{process.env.SECRET}',
    '`  ` and `` ` ``',
    'import value from "untrusted"\n\nexport const result = { danger: true }',
    '---\nname: changed\n---',
    '1. first\n   - nested\n\n> block quote\n> next line'
  ])('serializes untrusted syntax safely and idempotently: %s', value => {
    const result = normalizeAdditionalContent(value)
    expect(result).not.toBeNull()
    expect(result?.markdown).not.toMatch(
      /(?<!\\)<script|(?<!\\)<Widget|^import |^export |(?<!\\)\{process/gm
    )
    expect(normalizeAdditionalContent(result?.markdown)).toEqual(result)
  })

  it.each([
    'javascript:alert(1)',
    'data:text/html,hello',
    'file:///etc/passwd',
    '//evil.com',
    'vbscript:alert(1)',
    'http://evil.com',
    'https://127.0.0.1',
    'java&#x73;cript:alert(1)'
  ])('rejects unsafe clickable URLs: %s', url => {
    expect(normalizeAdditionalContent(`[link](${url})`)).toBeNull()
  })

  it.each([
    ['https://example.com/?q=&amp;amp;amp;amp;', 'https://example.com/?q=&amp;amp;amp;'],
    ['https://example.com/?a=1&b=2', 'https://example.com/?a=1&b=2'],
    ['https://example.com/?q=&amp;copy;', 'https://example.com/?q=&copy;']
  ])(
    'preserves entity-looking URL values across every normalization: %s',
    (sourceUrl, destination) => {
      const normalized = normalizeAdditionalContent(`[Guide](${sourceUrl})`)
      expect(normalized).not.toBeNull()
      let next = normalized
      for (let pass = 0; pass < 5; pass += 1) {
        next = normalizeAdditionalContent(next?.markdown)
        expect(next).toEqual(normalized)
      }
      const paragraph = unified()
        .use(remarkParse)
        .parse(normalized?.markdown ?? '').children[0]
      if (paragraph?.type !== 'paragraph') throw new Error('Expected a Markdown paragraph')
      expect(paragraph.children[0]).toMatchObject({ type: 'link', url: destination })
    }
  )

  it('resolves reference links and makes image destinations reviewable links', () => {
    const result = normalizeAdditionalContent(
      '[Guide][docs]\n\n![Logo](https://example.com/logo.png)\n\n[docs]: https://example.com/docs'
    )
    expect(result?.markdown).toBe(
      '[Guide](https://example.com/docs)\n\n[Logo](https://example.com/logo.png)'
    )
    expect(result?.hasUnassessedDestinations).toBe(true)
  })

  it('detects unassessed links, autolinks, and plain destinations', () => {
    for (const value of [
      '[Guide](https://example.com/docs)',
      '<https://example.com/docs>',
      'Read https://example.com/docs',
      'Visit www.example.com',
      'Visit https&#58;//unassessed.com',
      'Email user@example.com'
    ]) {
      expect(normalizeAdditionalContent(value)?.hasUnassessedDestinations).toBe(true)
    }
  })

  it('bounds input, canonical output, nesting and invalid characters', () => {
    expect(normalizeAdditionalContent('a'.repeat(5001))).toBeNull()
    expect(normalizeAdditionalContent('a'.repeat(5000))?.markdown).toHaveLength(5000)
    expect(normalizeAdditionalContent(`${'> '.repeat(100)}nested`)).toBeNull()
    expect(normalizeAdditionalContent('unsafe\u0000control')).toBeNull()
    expect(normalizeAdditionalContent({})).toBeNull()
    expect(normalizeAdditionalContent(null)?.markdown).toBe('')
    expect(normalizeAdditionalContent(' \r\n ')?.markdown).toBe('')
  })
})
