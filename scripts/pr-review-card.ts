import type { ReviewConclusion, SubmissionFrontmatter } from './pr-backfill-dry-run.ts'
import type { PullRequestClassification } from './pr-triage.ts'

export const REVIEW_CARD_MARKER = '<!-- pr-review-decision-card -->'

/** Display-only evidence; never used to authorize publication. */
export interface ReviewCardInput {
  repo: string
  number: number
  headSha: string
  classification: PullRequestClassification
  guidelineStatus: 'pass' | 'warn' | 'fail' | 'skipped'
  guidelineReasons: string[]
  reviewStatus: ReviewConclusion
  baseDuplicateStatus: 'unique' | 'duplicate' | 'unavailable'
  openPullRequestDuplicateStatus: 'unique' | 'duplicate' | 'unavailable'
  mergeAction: { status: 'failed' | 'merged' | 'planned' | 'skipped'; reason: string }
  submission?: SubmissionFrontmatter
}

/** Escape bounded plain text before inserting contributor data into Markdown. */
function plain(value: string): string {
  let result = ''
  for (const character of value.slice(0, 600).replace(/[\p{Cc}\p{Cf}\s]+/gu, ' ')) {
    const escaped = /[&<>@|\\`*_[\]#!]/.test(character)
      ? `&#${character.charCodeAt(0)};`
      : character
    if (result.length + escaped.length > 600) return `${result}…`
    result += escaped
  }
  return value.length > 600 ? `${result}…` : result
}

/** Render a bounded HTTP URL without credentials or Markdown injection. */
function link(value: string): string {
  try {
    const url = new URL(value)
    if (
      value.length > 1000 ||
      url.href.length > 1000 ||
      !['http:', 'https:'].includes(url.protocol) ||
      url.username ||
      url.password
    )
      return 'Invalid or unsupported URL'
    const destination = url.href.replace(/[<>`|\s]/g, character => encodeURIComponent(character))
    if (destination.length > 1000) return 'Invalid or unsupported URL'
    return `[${plain(value)}](<${destination}>)`
  } catch {
    return 'Invalid or unsupported URL'
  }
}

/** Explain unavailable duplicate evidence without implying uniqueness. */
function duplicate(status: ReviewCardInput['baseDuplicateStatus']): string {
  return status === 'unique'
    ? 'No duplicate found'
    : status === 'duplicate'
      ? 'Duplicate found'
      : 'Not evaluated / unavailable'
}

/** Render only explicitly selected submission fields, excluding body and signatures. */
function submissionRows(submission: SubmissionFrontmatter): string[] {
  return [
    `| Name | ${plain(submission.name)} |`,
    `| Description | ${plain(submission.description)} |`,
    `| Category | ${plain(submission.category)} |`,
    `| Published | ${plain(submission.publishedAt ?? 'Not supplied')} |`,
    `| Website | ${link(submission.website)} |`,
    `| llms.txt | ${link(submission.llmsUrl)} |`,
    `| llms-full.txt | ${submission.llmsFullUrl ? link(submission.llmsFullUrl) : 'Not supplied'} |`
  ]
}

/** Build a concise review card from the trusted scanner's existing decisions. */
export function buildReviewCard(input: ReviewCardInput): string {
  const prUrl = `https://github.com/${input.repo}/pull/${input.number}`
  const status = {
    failed: 'Merge failed',
    merged: 'Merged',
    planned: 'Merge planned (dry run)',
    skipped: 'Not merged'
  }[input.mergeAction.status]
  const lines = [
    REVIEW_CARD_MARKER,
    '## Submission review',
    '',
    `**${status}: ${plain(input.mergeAction.reason)}**`,
    '',
    `Assessed commit: ${plain(input.headSha)}. [View changes](${prUrl}/files) · [View checks](${prUrl}/checks)`,
    '',
    '| Check | Result |',
    '| --- | --- |',
    `| Scope | ${plain(input.classification.lane)} — ${plain(input.classification.reason)} |`,
    `| PR Review for assessed commit | ${plain(input.reviewStatus)} |`,
    `| Guidelines | ${plain(input.guidelineStatus)} |`,
    `| Duplicate in directory | ${duplicate(input.baseDuplicateStatus)} |`,
    `| Duplicate in open PRs | ${duplicate(input.openPullRequestDuplicateStatus)} |`,
    '',
    ...input.guidelineReasons.slice(0, 5).map(reason => `- ${plain(reason)}`),
    '',
    'Unavailable duplicate results are not a pass; prerequisites may have prevented evaluation.',
    '',
    ...(input.submission
      ? [
          '### New entry fields',
          '',
          'Contributor-supplied values; links are not an endorsement.',
          '',
          '| Field | Added value |',
          '| --- | --- |',
          ...submissionRows(input.submission)
        ]
      : [
          'Submission fields unavailable. Use the changes link to review modified, mixed, or unparseable files.'
        ]),
    '',
    'This is a snapshot, not merge authorization. If the head or checks change, use the latest workflow result.'
  ]
  let body = ''
  for (const line of lines) {
    if (body.length + line.length > 11000)
      return `${body}\n\nFurther details omitted; inspect the PR changes and checks.`
    body += `${body ? '\n' : ''}${line}`
  }
  return body
}

/** Minimal GitHub comment metadata needed to protect comment ownership. */
export interface ReviewCardComment {
  id: number
  body?: string | null
  user?: { login?: string; type?: string } | null
}

/** Upsert one bot-owned card after checking the current head; failures are display-only. */
export async function publishReviewCard(
  input: { repo: string; number: number; headSha: string; body: string },
  dependencies: {
    listComments: () => Promise<ReviewCardComment[]>
    getHead: () => Promise<string>
    write: (endpoint: string, method: 'POST' | 'PATCH', body: string) => Promise<void>
  }
): Promise<'published' | 'unchanged' | 'stale' | 'failed'> {
  try {
    const comments = await dependencies.listComments()
    const existing = comments
      .filter(
        comment =>
          comment.user?.login === 'github-actions[bot]' &&
          comment.user.type === 'Bot' &&
          comment.body?.startsWith(REVIEW_CARD_MARKER)
      )
      .sort((left, right) => left.id - right.id)[0]
    if ((await dependencies.getHead()) !== input.headSha) return 'stale'
    if (existing?.body === input.body) return 'unchanged'
    await dependencies.write(
      existing
        ? `repos/${input.repo}/issues/comments/${existing.id}`
        : `repos/${input.repo}/issues/${input.number}/comments`,
      existing ? 'PATCH' : 'POST',
      input.body
    )
    return 'published'
  } catch {
    return 'failed'
  }
}
