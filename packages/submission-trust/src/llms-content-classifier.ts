import { SUBMISSION_LLMS_MAX_BYTES } from '#constants'

const LEADING_METADATA_MAX_CHARS = 8_192
const MIN_MEANINGFUL_PRINTABLE_CHARS = 80
const MIN_PRINTABLE_RATIO = 0.9
const DOCUMENT_SIGNATURE = /^(?:<!doctype\s+html\b|<html\b|<head\b|<body\b)/i
const DOCUMENT_SIGNATURE_ANYWHERE = /<!doctype\s+html\b/i
const ACTIVE_MARKUP =
  /<\s*\/?\s*(?:base|embed|form|iframe|input|link|math|meta|object|script|style|svg)\b/i
const HTML_TAG = /<\/?[a-z][a-z0-9-]*(?:[ \t\r\n]+[^>\n]{0,512})?[ \t\r\n]*\/?>/i
const ABSOLUTE_LINK = /https?:\/\/[^\s)>\]]+/i
const H1_HEADING = /^#\s+\S/m

/** Internal confidence levels for bounded llms text classification. */
export type LlmsTextClassification = 'high_confidence' | 'invalid' | 'nonstandard'

const hasCommonMarkCodeIndent = (line: string): boolean => {
  let columns = 0
  for (const character of line) {
    if (character === ' ') columns += 1
    else if (character === '\t') columns += 4 - (columns % 4)
    else return false
    if (columns >= 4) return true
  }
  return false
}

const stripIndentedCode = (body: string): string => {
  const lines = body.split('\n')
  const masked: string[] = []
  let inBlock = false
  let previousBlank = true
  for (const line of lines) {
    const blank = line.length === 0 || /^[ \t\r]+$/.test(line)
    if (blank) {
      masked.push('')
      previousBlank = true
      continue
    }
    const indented = hasCommonMarkCodeIndent(line)
    if (indented && (inBlock || previousBlank)) {
      masked.push('')
      inBlock = true
      previousBlank = false
      continue
    }
    masked.push(line)
    inBlock = false
    previousBlank = false
  }
  return masked.join('\n')
}

const stripMarkdownCode = (body: string): string => {
  const withoutFences = body
    .replace(/(^|\n)[ \t]*```[^\n]*\n[\s\S]*?(?:\n[ \t]*```[ \t]*(?=\n|$)|$)/g, '$1')
    .replace(/(^|\n)[ \t]*~~~[^\n]*\n[\s\S]*?(?:\n[ \t]*~~~[ \t]*(?=\n|$)|$)/g, '$1')
  return stripIndentedCode(withoutFences)
    .replace(/`[^`\n]*`/g, '')
    .replace(/<https?:\/\/[^>\n]+>/gi, '')
    .replace(/<[^<>\s@]+@[^<>\s]+>/g, '')
}

const normalizedLeadingContent = (body: string): string | undefined => {
  const limit = Math.min(body.length, LEADING_METADATA_MAX_CHARS)
  let index = 0
  while (index < limit) {
    while (index < limit && (body[index] === '\uFEFF' || /\s/.test(body[index] ?? ''))) index += 1
    if (body.startsWith('<!--', index)) {
      const closeOffset = body.slice(index, limit).indexOf('-->')
      if (closeOffset < 0) return undefined
      index += closeOffset + 3
      continue
    }
    if (body.slice(index, index + 5).toLowerCase() === '<?xml') {
      const closeOffset = body.slice(index, limit).indexOf('?>')
      if (closeOffset < 0) return undefined
      index += closeOffset + 2
      continue
    }
    break
  }
  if (index === limit && body.length > limit) return undefined
  return body.slice(index, Math.min(body.length, index + 128))
}

const isInvisibleFormat = (codePoint: number): boolean =>
  codePoint === 0x00ad ||
  codePoint === 0x061c ||
  (codePoint >= 0x0300 && codePoint <= 0x036f) ||
  (codePoint >= 0x1ab0 && codePoint <= 0x1aff) ||
  (codePoint >= 0x1dc0 && codePoint <= 0x1dff) ||
  (codePoint >= 0x200b && codePoint <= 0x200f) ||
  (codePoint >= 0x202a && codePoint <= 0x202e) ||
  (codePoint >= 0x2060 && codePoint <= 0x206f) ||
  (codePoint >= 0x20d0 && codePoint <= 0x20ff) ||
  (codePoint >= 0xfe00 && codePoint <= 0xfe0f) ||
  (codePoint >= 0xfe20 && codePoint <= 0xfe2f) ||
  codePoint === 0xfeff ||
  (codePoint >= 0xe0000 && codePoint <= 0xe007f) ||
  (codePoint >= 0xe0100 && codePoint <= 0xe01ef)

const printableMetrics = (body: string): readonly [number, number] | undefined => {
  let printable = 0
  let total = 0
  for (let index = 0; index < body.length; ) {
    const codePoint = body.codePointAt(index)
    if (codePoint === undefined) return undefined
    index += codePoint > 0xffff ? 2 : 1
    if (codePoint === 9 || codePoint === 10 || codePoint === 13 || codePoint === 32) continue
    total += 1
    if (
      codePoint < 32 ||
      (codePoint >= 0x7f && codePoint <= 0x9f) ||
      (codePoint >= 0xd800 && codePoint <= 0xdfff)
    ) {
      return undefined
    }
    if (!isInvisibleFormat(codePoint)) printable += 1
  }
  return [printable, total]
}

/**
 * Classifies one inspector-bounded llms body without trusting media labels or
 * scanning beyond the published resource ceiling.
 */
export const classifyLlmsTextBody = (body: string): LlmsTextClassification => {
  if (!body || body.length > SUBMISSION_LLMS_MAX_BYTES) return 'invalid'
  const prose = stripMarkdownCode(body)
  const leading = normalizedLeadingContent(prose)
  if (
    !leading ||
    DOCUMENT_SIGNATURE.test(leading) ||
    DOCUMENT_SIGNATURE_ANYWHERE.test(prose) ||
    ACTIVE_MARKUP.test(prose) ||
    HTML_TAG.test(prose)
  ) {
    return 'invalid'
  }
  const metrics = printableMetrics(body)
  if (!metrics) return 'invalid'
  const [printable, total] = metrics
  if (total === 0 || printable / total < MIN_PRINTABLE_RATIO) return 'invalid'
  if (
    printable < MIN_MEANINGFUL_PRINTABLE_CHARS ||
    !H1_HEADING.test(prose) ||
    !ABSOLUTE_LINK.test(prose)
  ) {
    return 'nonstandard'
  }
  return 'high_confidence'
}
