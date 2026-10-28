import { type Options, toMarkdown } from 'mdast-util-to-markdown'
import remarkParse from 'remark-parse'
import { unified } from 'unified'
import { validateSubmissionUrl } from '#url-policy'

/** Maximum source and canonical Markdown characters accepted for additional content. */
export const MAX_ADDITIONAL_CONTENT_CHARACTERS = 5000

const parser = unified().use(remarkParse).freeze()
type MarkdownTree = ReturnType<typeof parser.parse>
type MarkdownNode =
  | MarkdownTree
  | MarkdownTree['children'][number]
  | Extract<MarkdownTree['children'][number], { type: 'list' }>['children'][number]
type Definition = Extract<MarkdownNode, { type: 'definition' }>

/** Canonical safe Markdown plus conservative outbound-destination review evidence. */
export interface AdditionalContent {
  readonly hasUnassessedDestinations: boolean
  readonly markdown: string
}

const escapeText = (value: string): string =>
  value
    .replace(/\r\n?/g, '\n')
    .replace(/[\\`*_[\]{}()<>#+\-.!|~>=&]/g, '\\$&')
    .replace(
      /(^|\n)(\s*)(import|export)(?=\s)/g,
      (_match, line: string, spaces: string, word: string) =>
        `${line}${spaces}&#${word.charCodeAt(0)};${word.slice(1)}`
    )

const longestRun = (value: string, character: string): number =>
  Math.max(
    0,
    ...Array.from(value.matchAll(new RegExp(`${character}+`, 'g')), match => match[0].length)
  )

const inlineCode = (value: string): string => {
  const delimiter = '`'.repeat(longestRun(value, '`') + 1)
  const padding = /^[ `]|[ `]$/.test(value) && /[^ ]/.test(value) ? ' ' : ''
  return `${delimiter}${padding}${value}${padding}${delimiter}`
}

const PROSE_DESTINATION =
  /(?:[a-z][a-z0-9+.-]*:\/\/[^\s<>"'`()]+|\bwww\.[^\s<>"'`()]+|[\w.+-]+@[\w.-]+\.[a-z]{2,})/gi

/** Escape literal MDX text and keep GFM from turning URL-looking prose into live links. */
export const serializeSubmissionText = (value: string): string => {
  const normalized = value.replace(/\r\n?/g, '\n')
  let previousEnd = 0
  const fragments: string[] = []
  for (const match of normalized.matchAll(PROSE_DESTINATION)) {
    fragments.push(escapeText(normalized.slice(previousEnd, match.index)), inlineCode(match[0]))
    previousEnd = match.index + match[0].length
  }
  fragments.push(escapeText(normalized.slice(previousEnd)))
  return fragments.join('')
}

type Phrasing = Extract<MarkdownNode, { type: 'paragraph' }>['children'][number]
type Block = Extract<MarkdownNode, { type: 'blockquote' }>['children'][number]

const markdownOptions: Options = {
  bullet: '-',
  emphasis: '*',
  fences: true,
  listItemIndent: 'one',
  resourceLink: true,
  unsafe: [
    { character: '<', inConstruct: 'phrasing' },
    { character: '{', inConstruct: 'phrasing' },
    { character: '}', inConstruct: 'phrasing' },
    { character: 'i', atBreak: true, after: 'mport\\s' },
    { character: 'e', atBreak: true, after: 'xport\\s' }
  ]
}

const safeDestination = (value: string): string => {
  const result = validateSubmissionUrl(value)
  if (!result.ok) throw new Error('Unsupported additional-content destination')
  // Resource identity omits fragments; content links must keep their anchor or route.
  result.url.hash = new URL(value).hash
  return result.url.href
}

const proseNodes = (value: string): Phrasing[] => {
  let previousEnd = 0
  const nodes: Phrasing[] = []
  for (const match of value.matchAll(PROSE_DESTINATION)) {
    if (match.index > previousEnd)
      nodes.push({ type: 'text', value: value.slice(previousEnd, match.index) })
    nodes.push({ type: 'inlineCode', value: match[0] })
    previousEnd = match.index + match[0].length
  }
  if (previousEnd < value.length) nodes.push({ type: 'text', value: value.slice(previousEnd) })
  return nodes
}

const mergePhrasing = (nodes: readonly Phrasing[]): Phrasing[] => {
  const merged: Phrasing[] = []
  for (const node of nodes) {
    const previous = merged.at(-1)
    if (
      (node.type === 'text' && previous?.type === 'text') ||
      (node.type === 'inlineCode' && previous?.type === 'inlineCode')
    ) {
      previous.value += node.value
    } else if (
      (node.type === 'strong' && previous?.type === 'strong') ||
      (node.type === 'emphasis' && previous?.type === 'emphasis')
    ) {
      previous.children = mergePhrasing([...previous.children, ...node.children])
    } else {
      merged.push(node)
    }
  }
  return merged
}

const sanitizeTree = (tree: MarkdownTree): MarkdownTree => {
  const definitions = new Map<string, Definition>()
  let examinedNodes = 0
  const collect = (node: MarkdownNode, depth: number): void => {
    if (depth > 32 || ++examinedNodes > 2500) throw new Error('Additional content exceeds limits')
    if (node.type === 'definition') definitions.set(node.identifier.toLowerCase(), node)
    if ('children' in node) for (const child of node.children) collect(child, depth + 1)
  }
  collect(tree, 0)
  const phrasing = (nodes: readonly Phrasing[]): Phrasing[] =>
    mergePhrasing(
      nodes.flatMap<Phrasing>(node => {
        switch (node.type) {
          case 'text':
          case 'html':
            return proseNodes(node.value)
          case 'strong':
          case 'emphasis':
            return [{ ...node, children: phrasing(node.children) }]
          case 'inlineCode':
          case 'break':
            return [{ ...node }]
          case 'link':
            return [
              { type: 'link', url: safeDestination(node.url), children: phrasing(node.children) }
            ]
          case 'image':
            return [
              {
                type: 'link',
                url: safeDestination(node.url),
                children: proseNodes(node.alt ?? 'Image')
              }
            ]
          case 'linkReference':
          case 'imageReference': {
            const definition = definitions.get(node.identifier.toLowerCase())
            if (!definition) throw new Error('Unresolved additional-content reference')
            return [
              {
                type: 'link',
                url: safeDestination(definition.url),
                children:
                  node.type === 'linkReference'
                    ? phrasing(node.children)
                    : proseNodes(node.alt ?? 'Image')
              }
            ]
          }
          default:
            throw new Error('Unsupported additional-content Markdown')
        }
      })
    )
  const blocks = (nodes: readonly MarkdownTree['children'][number][]): Block[] =>
    nodes.flatMap<Block>(node => {
      switch (node.type) {
        case 'definition':
          return []
        case 'paragraph':
        case 'heading':
          return [{ ...node, children: phrasing(node.children) }]
        case 'html':
          return [{ type: 'paragraph', children: phrasing([node]) }]
        case 'blockquote':
          return [{ ...node, children: blocks(node.children) }]
        case 'list':
          return [
            {
              ...node,
              children: node.children.map(item => ({ ...item, children: blocks(item.children) }))
            }
          ]
        case 'code':
          return [
            {
              ...node,
              lang: node.lang && /^[a-zA-Z0-9_+-]{1,32}$/.test(node.lang) ? node.lang : null,
              meta: null
            }
          ]
        case 'thematicBreak':
          return [{ ...node }]
        default:
          throw new Error('Unsupported additional-content Markdown')
      }
    })
  return { type: 'root', children: blocks(tree.children) }
}

const hasDestinations = (tree: MarkdownTree): boolean => {
  const nodes: MarkdownNode[] = [...tree.children]
  while (nodes.length > 0) {
    const node = nodes.pop()
    if (!node) break
    if (node.type === 'link' || node.type === 'image') return true
    if (
      'value' in node &&
      /(?:[a-z][a-z0-9+.-]*:\/\/|\bwww\.|[\w.+-]+@[\w.-]+\.[a-z]{2,})/i.test(node.value)
    )
      return true
    if ('children' in node) nodes.push(...node.children)
  }
  return false
}

/** Parse a bounded Markdown whitelist and serialize it as inert, canonical MDX-safe Markdown. */
export const normalizeAdditionalContent = (value: unknown): AdditionalContent | null => {
  if (value === undefined || value === null)
    return { hasUnassessedDestinations: false, markdown: '' }
  if (typeof value !== 'string' || value.length > MAX_ADDITIONAL_CONTENT_CHARACTERS) return null
  for (const character of value) {
    const point = character.codePointAt(0) ?? 0
    if (
      (point < 32 && ![9, 10, 13].includes(point)) ||
      (point >= 127 && point <= 159) ||
      (point >= 0xd800 && point <= 0xdfff)
    )
      return null
  }
  try {
    const tree = sanitizeTree(parser.parse(value.replace(/\r\n?/g, '\n').trim()))
    const markdown = toMarkdown(tree, markdownOptions).trim()
    if (markdown.length > MAX_ADDITIONAL_CONTENT_CHARACTERS) return null
    return {
      hasUnassessedDestinations: hasDestinations(tree),
      markdown
    }
  } catch {
    return null
  }
}
