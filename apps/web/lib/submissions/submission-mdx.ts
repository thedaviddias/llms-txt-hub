import { renderSubmissionBody } from '@thedaviddias/submission-trust/submission-body'
import type { SubmissionFields } from '@thedaviddias/submission-trust/types'
import yaml from 'js-yaml'

/**
 * Derive the listing filename from its normalized display name.
 */
const slugify = (name: string): string =>
  name
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9 -]+/g, ' ')
    .trim()
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')

/**
 * Render one listing with quoted frontmatter and its canonical safe Markdown body.
 */
export function renderSubmissionMdx(
  fields: SubmissionFields
): { readonly content: string; readonly path: string } | null {
  const slug = slugify(fields.name)
  const body = renderSubmissionBody(fields)
  if (!slug || body === null) return null
  const frontmatter = yaml.dump(
    {
      category: fields.category,
      description: fields.description,
      llmsFullUrl: fields.llmsFullUrl ?? '',
      llmsUrl: fields.llmsUrl,
      name: fields.name,
      publishedAt: fields.publishedAt,
      website: fields.website
    },
    { forceQuotes: true, indent: 2, lineWidth: -1, quotingType: "'", sortKeys: true }
  )
  return {
    content: `---\n${frontmatter}---\n\n${body}`,
    path: `packages/content/data/websites/${slug}-llms-txt.mdx`
  }
}
