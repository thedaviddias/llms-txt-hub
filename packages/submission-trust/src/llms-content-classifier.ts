import remarkParse from 'remark-parse'
import { unified } from 'unified'

import { SUBMISSION_LLMS_MAX_BYTES } from '#constants'

const MIN_MEANINGFUL_PRINTABLE_CHARS = 80
const MIN_PRINTABLE_RATIO = 0.9
const ABSOLUTE_LINK = /https?:\/\/[^\s)>\]]+/i
const markdownParser = unified().use(remarkParse).freeze()

/** Internal confidence levels for bounded llms text classification. */
export type LlmsTextClassification = 'high_confidence' | 'invalid' | 'nonstandard'

interface MarkdownEvidence {
  hasAbsoluteLink: boolean
  hasH1: boolean
  printable: number
  total: number
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

const isUnsafeControl = (codePoint: number): boolean =>
  (codePoint < 32 && codePoint !== 9 && codePoint !== 10 && codePoint !== 13) ||
  (codePoint >= 0x7f && codePoint <= 0x9f) ||
  (codePoint >= 0xd800 && codePoint <= 0xdfff)

const containsUnsafeCodePoint = (value: string): boolean => {
  for (let index = 0; index < value.length; ) {
    const codePoint = value.codePointAt(index)
    if (codePoint === undefined || isUnsafeControl(codePoint)) return true
    index += codePoint > 0xffff ? 2 : 1
  }
  return false
}

const printableMetrics = (value: string): readonly [number, number] | undefined => {
  let printable = 0
  let total = 0
  for (let index = 0; index < value.length; ) {
    const codePoint = value.codePointAt(index)
    if (codePoint === undefined) return undefined
    index += codePoint > 0xffff ? 2 : 1
    if (codePoint === 9 || codePoint === 10 || codePoint === 13 || codePoint === 32) continue
    total += 1
    if (isUnsafeControl(codePoint)) return undefined
    if (!isInvisibleFormat(codePoint)) printable += 1
  }
  return [printable, total]
}

const inspectMarkdown = (body: string): MarkdownEvidence | undefined => {
  try {
    const tree = markdownParser.parse(body)
    const nodes = [...tree.children]
    const hasDocumentH1 = tree.children.some(node => {
      if (node.type !== 'heading' || node.depth !== 1) return false
      const headingNodes = [...node.children]
      while (headingNodes.length > 0) {
        const headingNode = headingNodes.pop()
        if (!headingNode) return false
        if (headingNode.type === 'text' || headingNode.type === 'inlineCode') {
          const metrics = printableMetrics(headingNode.value)
          if (metrics && metrics[0] > 0) return true
        }
        if (
          (headingNode.type === 'image' || headingNode.type === 'imageReference') &&
          headingNode.alt
        ) {
          const metrics = printableMetrics(headingNode.alt)
          if (metrics && metrics[0] > 0) return true
        }
        if ('children' in headingNode) headingNodes.push(...headingNode.children)
      }
      return false
    })
    const evidence: MarkdownEvidence = {
      hasAbsoluteLink: false,
      hasH1: hasDocumentH1,
      printable: 0,
      total: 0
    }
    let examinedNodes = 0

    while (nodes.length > 0) {
      const node = nodes.pop()
      if (!node || ++examinedNodes > SUBMISSION_LLMS_MAX_BYTES) return undefined
      if (node.type === 'html') return undefined
      if ((node.type === 'link' || node.type === 'definition') && /^https?:\/\//i.test(node.url)) {
        evidence.hasAbsoluteLink = true
      }
      if (node.type === 'text') {
        const metrics = printableMetrics(node.value)
        if (!metrics) return undefined
        evidence.printable += metrics[0]
        evidence.total += metrics[1]
        if (ABSOLUTE_LINK.test(node.value)) evidence.hasAbsoluteLink = true
      }
      if ('children' in node) nodes.push(...node.children)
    }

    return evidence
  } catch {
    return undefined
  }
}

/**
 * Classifies one inspector-bounded llms body without trusting media labels or
 * scanning beyond the published resource ceiling.
 */
export const classifyLlmsTextBody = (body: string): LlmsTextClassification => {
  if (!body || body.length > SUBMISSION_LLMS_MAX_BYTES || containsUnsafeCodePoint(body)) {
    return 'invalid'
  }
  const evidence = inspectMarkdown(body)
  if (!evidence || evidence.total === 0) return 'invalid'
  if (evidence.printable / evidence.total < MIN_PRINTABLE_RATIO) return 'invalid'
  if (
    evidence.printable < MIN_MEANINGFUL_PRINTABLE_CHARS ||
    !evidence.hasH1 ||
    !evidence.hasAbsoluteLink
  ) {
    return 'nonstandard'
  }
  return 'high_confidence'
}
