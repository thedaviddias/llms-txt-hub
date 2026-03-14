import { describe, expect, it } from 'vitest'
import { classifyPullRequest } from './pr-triage.ts'

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
