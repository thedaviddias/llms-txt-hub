import { describe, expect, it, vi } from 'vitest'
import { buildReviewCard, publishReviewCard, REVIEW_CARD_MARKER } from './pr-review-card.ts'
import { classifyPullRequest } from './pr-triage.ts'

const cardInput = () => ({
  repo: 'thedaviddias/llms-txt-hub',
  number: 42,
  headSha: 'a'.repeat(40),
  classification: classifyPullRequest(buildContext()),
  guidelineStatus: 'warn' as const,
  guidelineReasons: ['Waiting for trusted CI.'],
  reviewStatus: 'in_progress' as const,
  baseDuplicateStatus: 'unavailable' as const,
  openPullRequestDuplicateStatus: 'unavailable' as const,
  mergeAction: { status: 'skipped' as const, reason: 'Trusted PR Review has not passed.' },
  submission: {
    name: 'Example',
    description: 'Developer documentation',
    category: 'developer-tools',
    publishedAt: '2026-09-08',
    website: 'https://example.com',
    llmsUrl: 'https://example.com/llms.txt'
  }
})

describe('PR review decision card', () => {
  it('puts the actual action first and distinguishes missing evidence from a pass', () => {
    const card = buildReviewCard(cardInput())
    expect(card).toContain('Trusted PR Review has not passed.')
    expect(card).toContain('Not evaluated / unavailable')
    expect(card).toContain('[https://example.com](<https://example.com/>)')
    expect(card).toContain('New entry fields')
    expect(card).toContain('a'.repeat(40))
    expect(card).not.toContain('Ready to merge')
  })

  it('escapes contributor markup and mentions, suppresses credentials and bounds output', () => {
    const input = cardInput()
    input.submission.name = '<img src=x> @everyone | [click](https://evil.test)'
    input.submission.description = 'x'.repeat(100000)
    input.submission.website = 'https://user:secret@example.com'
    input.submission.llmsUrl = 'javascript:alert(1)'
    const card = buildReviewCard(input)
    expect(card).not.toContain('<img')
    expect(card).not.toContain('@everyone')
    expect(card).not.toContain('secret')
    expect(card).not.toContain('javascript:')
    expect(card).toContain('Invalid or unsupported URL')
    expect(card.length).toBeLessThan(12000)
    expect(card.startsWith(REVIEW_CARD_MARKER)).toBe(true)
  })

  it('updates only the canonical bot-owned card and ignores a forged marker', async () => {
    const write = vi.fn(async () => undefined)
    const result = await publishReviewCard(
      { repo: 'owner/repo', number: 42, headSha: 'a'.repeat(40), body: 'card' },
      {
        listComments: async () => [
          { id: 1, body: REVIEW_CARD_MARKER, user: { login: 'contributor', type: 'User' } },
          { id: 3, body: REVIEW_CARD_MARKER, user: { login: 'github-actions[bot]', type: 'Bot' } },
          { id: 2, body: REVIEW_CARD_MARKER, user: { login: 'github-actions[bot]', type: 'Bot' } }
        ],
        getHead: async () => 'a'.repeat(40),
        write
      }
    )
    expect(result).toBe('published')
    expect(write).toHaveBeenCalledWith('repos/owner/repo/issues/comments/2', 'PATCH', 'card')
  })

  it('creates a card and avoids writes when the bot already has identical content', async () => {
    const body = `${REVIEW_CARD_MARKER}\ncard`
    const write = vi.fn(async () => undefined)
    const input = { repo: 'owner/repo', number: 42, headSha: 'a'.repeat(40), body }
    const getHead = async () => input.headSha
    expect(await publishReviewCard(input, { listComments: async () => [], getHead, write })).toBe(
      'published'
    )
    expect(write).toHaveBeenCalledWith('repos/owner/repo/issues/42/comments', 'POST', body)
    write.mockClear()
    expect(
      await publishReviewCard(input, {
        listComments: async () => [
          { id: 1, body, user: { login: 'github-actions[bot]', type: 'Bot' } }
        ],
        getHead,
        write
      })
    ).toBe('unchanged')
    expect(write).not.toHaveBeenCalled()
  })

  it('bounds even entirely escaped fields without exposing MDX body data', () => {
    const input = cardInput()
    const long = '<'.repeat(100000)
    input.submission = { ...input.submission, name: long, description: long, category: long }
    input.guidelineReasons = Array.from({ length: 100 }, () => long)
    const card = buildReviewCard({
      ...input,
      submission: { ...input.submission, mdxContent: 'PRIVATE_BODY' }
    })
    expect(card.length).toBeLessThan(12000)
    expect(card).not.toContain('PRIVATE_BODY')
  })

  it.each(['moved', 'unavailable', 'write failure'])(
    'suppresses %s without changing merge decisions',
    async scenario => {
      const write = vi.fn(async () => {
        throw new Error('private failure')
      })
      const result = await publishReviewCard(
        { repo: 'owner/repo', number: 42, headSha: 'a'.repeat(40), body: 'card' },
        {
          listComments: async () => [],
          getHead: async () => {
            if (scenario === 'unavailable') throw new Error('private failure')
            return scenario === 'moved' ? 'b'.repeat(40) : 'a'.repeat(40)
          },
          write
        }
      )
      expect(result).toBe(scenario === 'moved' ? 'stale' : 'failed')
      if (scenario !== 'write failure') expect(write).not.toHaveBeenCalled()
    }
  )
})

function buildContext(overrides?: {
  authorLogin?: string
  commits?: Array<{ authorLogin: string | null; committerLogin: string | null }>
  files?: Array<{
    additions?: number
    changes?: number
    deletions?: number
    filename: string
    status: string
  }>
  headRefName?: string
  title?: string
}) {
  return {
    authorLogin: overrides?.authorLogin ?? 'octocat',
    commits: overrides?.commits ?? [
      {
        authorLogin: overrides?.authorLogin ?? 'octocat',
        committerLogin: overrides?.authorLogin ?? 'octocat'
      }
    ],
    files: overrides?.files ?? [
      {
        additions: 30,
        changes: 30,
        deletions: 0,
        filename: 'packages/content/data/websites/example.mdx',
        status: 'added'
      }
    ],
    headRefName: overrides?.headRefName ?? 'add/example',
    title: overrides?.title ?? 'feat: add example website'
  }
}

describe('classifyPullRequest', () => {
  it('marks a single added mdx entry under the allowlist as fast lane', () => {
    const result = classifyPullRequest(buildContext())

    expect(result.lane).toBe('mdx-fast')
    expect(result.automergeEligible).toBe(true)
    expect(result.manualWebsitesJsonChange).toBe(false)
    expect(result.labels).toContain('lane:mdx-fast')
    expect(result.labels).toContain('automerge:candidate')
  })

  it('keeps multiple added mdx entries under the allowlist in the fast lane', () => {
    const result = classifyPullRequest(
      buildContext({
        files: [
          {
            additions: 25,
            changes: 25,
            deletions: 0,
            filename: 'packages/content/data/websites/one.mdx',
            status: 'added'
          },
          {
            additions: 40,
            changes: 40,
            deletions: 0,
            filename: 'packages/content/data/websites/two.mdx',
            status: 'added'
          }
        ]
      })
    )

    expect(result.lane).toBe('mdx-fast')
    expect(result.automergeEligible).toBe(true)
  })

  it('routes modified mdx entries to the standard lane', () => {
    const result = classifyPullRequest(
      buildContext({
        files: [
          {
            additions: 3,
            changes: 6,
            deletions: 3,
            filename: 'packages/content/data/websites/example.mdx',
            status: 'modified'
          }
        ]
      })
    )

    expect(result.lane).toBe('standard')
    expect(result.automergeEligible).toBe(false)
    expect(result.reason).toContain('modifies existing files')
  })

  it('routes mixed mdx and non-mdx changes to the standard lane', () => {
    const result = classifyPullRequest(
      buildContext({
        files: [
          {
            additions: 30,
            changes: 30,
            deletions: 0,
            filename: 'packages/content/data/websites/example.mdx',
            status: 'added'
          },
          {
            additions: 4,
            changes: 4,
            deletions: 0,
            filename: 'README.md',
            status: 'added'
          }
        ]
      })
    )

    expect(result.lane).toBe('standard')
    expect(result.automergeEligible).toBe(false)
  })

  it('routes mdx additions outside the allowlist to the standard lane', () => {
    const result = classifyPullRequest(
      buildContext({
        files: [
          {
            additions: 15,
            changes: 15,
            deletions: 0,
            filename: 'packages/content/websites/data/example.mdx',
            status: 'added'
          }
        ]
      })
    )

    expect(result.lane).toBe('standard')
    expect(result.automergeEligible).toBe(false)
  })

  it('blocks manual websites.json modifications', () => {
    const result = classifyPullRequest(
      buildContext({
        files: [
          {
            additions: 10,
            changes: 10,
            deletions: 0,
            filename: 'data/websites.json',
            status: 'modified'
          }
        ]
      })
    )

    expect(result.lane).toBe('blocked')
    expect(result.manualWebsitesJsonChange).toBe(true)
    expect(result.labels).toContain('needs:generated-file-review')
    expect(result.labels).toContain('generated:websites-json')
  })

  it('allows the known automated websites.json pull request shape', () => {
    const result = classifyPullRequest(
      buildContext({
        authorLogin: 'github-actions[bot]',
        commits: [
          {
            authorLogin: 'github-actions[bot]',
            committerLogin: 'github-actions[bot]'
          }
        ],
        files: [
          {
            additions: 120,
            changes: 120,
            deletions: 0,
            filename: 'data/websites.json',
            status: 'modified'
          }
        ],
        headRefName: 'update-websites-json',
        title: 'chore: update websites.json'
      })
    )

    expect(result.lane).toBe('standard')
    expect(result.manualWebsitesJsonChange).toBe(false)
    expect(result.labels).toContain('generated:websites-json')
    expect(result.labels).not.toContain('status:blocked')
  })

  it('blocks mixed prs that include safe mdx additions and websites.json', () => {
    const result = classifyPullRequest(
      buildContext({
        files: [
          {
            additions: 30,
            changes: 30,
            deletions: 0,
            filename: 'packages/content/data/websites/example.mdx',
            status: 'added'
          },
          {
            additions: 12,
            changes: 12,
            deletions: 0,
            filename: 'data/websites.json',
            status: 'modified'
          }
        ]
      })
    )

    expect(result.lane).toBe('blocked')
    expect(result.manualWebsitesJsonChange).toBe(true)
    expect(result.automergeEligible).toBe(false)
  })
})
