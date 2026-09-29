import { normalizeAdditionalContent, serializeSubmissionText } from '#additional-content'
import type { SubmissionFields } from '#types'

type BodyFields = Pick<SubmissionFields, 'name' | 'description' | 'mdxContent'>

/** Parsed body retained for trusted editorial reassessment and automatic-merge gating. */
export interface ParsedSubmissionBody {
  readonly canonical: boolean
  readonly mdxContent?: string
}

const bodyPrefix = (fields: BodyFields): string =>
  `# ${serializeSubmissionText(fields.name)}\n\n${serializeSubmissionText(fields.description)}`

/** Render the canonical generated body with bounded, non-executable additional Markdown. */
export const renderSubmissionBody = (fields: BodyFields): string | null => {
  const additional = normalizeAdditionalContent(fields.mdxContent)
  if (!additional) return null
  return `${bodyPrefix(fields)}${additional.markdown ? `\n\n${additional.markdown}` : ''}\n`
}

/** Retain PR-authored body text and recognize only the exact safe generated Markdown shape. */
export const parseSubmissionBody = (body: string, fields: BodyFields): ParsedSubmissionBody => {
  const source = body.trim()
  const prefix = bodyPrefix(fields)
  if (!source || source === prefix) return { canonical: true }
  const hasPrefix = source.startsWith(`${prefix}\n\n`)
  const mdxContent = hasPrefix ? source.slice(prefix.length + 2) : source
  const normalized = normalizeAdditionalContent(mdxContent)
  return {
    canonical: hasPrefix && Boolean(normalized && normalized.markdown === mdxContent),
    ...(mdxContent ? { mdxContent } : {})
  }
}
