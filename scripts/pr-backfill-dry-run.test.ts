import { describe, expect, it } from 'vitest'
import {
  assessSubmissionGuidelines,
  buildClassifierContext,
  deriveStructuralDecision,
  deriveWouldMergeDecision,
  parseSubmissionFrontmatter
} from './pr-backfill-dry-run.ts'

describe('buildClassifierContext', () => {
  it('maps GitHub API payloads into the classifier input shape', () => {
    const result = buildClassifierContext({
      commits: [
        {
          author: { login: 'octocat' },
          committer: { login: 'octocat' }
        }
      ],
      details: {
        draft: false,
        head: {
          ref: 'add/example',
          sha: 'abc123',
          user: { login: 'octocat' }
        },
        mergeable: true,
        number: 123,
        state: 'open',
        title: 'feat: add example website',
        user: {
          login: 'octocat'
        }
      },
      files: [
        {
          additions: 25,
          changes: 25,
          deletions: 0,
          filename: 'packages/content/data/websites/example.mdx',
          previous_filename: null,
          status: 'added'
        }
      ]
    })

    expect(result).toEqual({
      authorLogin: 'octocat',
      commits: [
        {
          authorLogin: 'octocat',
          committerLogin: 'octocat'
        }
      ],
      files: [
        {
          additions: 25,
          changes: 25,
          deletions: 0,
          filename: 'packages/content/data/websites/example.mdx',
          previousFilename: null,
          status: 'added'
        }
      ],
      headRefName: 'add/example',
      title: 'feat: add example website'
    })
  })
})

describe('parseSubmissionFrontmatter', () => {
  it('extracts the required frontmatter fields from mdx content', () => {
    const result = parseSubmissionFrontmatter(`---
name: 'Example'
description: 'Example is a developer platform with API docs for AI agents.'
website: 'https://example.com'
llmsUrl: 'https://example.com/llms.txt'
llmsFullUrl: 'https://example.com/llms-full.txt'
category: 'developer-tools'
publishedAt: '2026-03-14'
---

# Example
`)

    expect(result).toEqual({
      category: 'developer-tools',
      description: 'Example is a developer platform with API docs for AI agents.',
      llmsFullUrl: 'https://example.com/llms-full.txt',
      llmsUrl: 'https://example.com/llms.txt',
      name: 'Example',
      publishedAt: '2026-03-14',
      website: 'https://example.com'
    })
  })
})

describe('assessSubmissionGuidelines', () => {
  const baseFrontmatter = {
    category: 'developer-tools',
    description: 'Example is a developer platform with API docs for AI agents.',
    llmsFullUrl: '',
    llmsUrl: 'https://example.com/llms.txt',
    name: 'Example',
    website: 'https://example.com'
  }

  it('passes a structurally safe tool submission with matching signals', () => {
    const result = assessSubmissionGuidelines({
      frontmatter: baseFrontmatter,
      homepageInspection: {
        contentType: 'text/html',
        ok: true,
        status: 200,
        text: 'Example is a developer platform with API docs and SDK references.',
        url: 'https://example.com'
      },
      llmsInspection: {
        contentType: 'text/plain',
        ok: true,
        status: 200,
        text: 'Example docs for API integration, SDK usage, and developer workflows.'.repeat(4),
        url: 'https://example.com/llms.txt'
      }
    })

    expect(result).toEqual({
      guidelineReasons: ['No guideline concerns detected.'],
      guidelineStatus: 'pass',
      policyEligible: true
    })
  })

  it('warns when a non-tool category requires manual review', () => {
    const result = assessSubmissionGuidelines({
      frontmatter: {
        ...baseFrontmatter,
        category: 'personal'
      },
      homepageInspection: {
        contentType: 'text/html',
        ok: true,
        status: 200,
        text: 'A personal website and blog.',
        url: 'https://example.com'
      },
      llmsInspection: {
        contentType: 'text/plain',
        ok: true,
        status: 200,
        text: 'This personal site includes some notes and posts.'.repeat(4),
        url: 'https://example.com/llms.txt'
      }
    })

    expect(result.guidelineStatus).toBe('warn')
    expect(result.policyEligible).toBe(false)
    expect(result.guidelineReasons[0]).toContain('requires manual review')
  })

  it('fails when llms.txt is inaccessible', () => {
    const result = assessSubmissionGuidelines({
      frontmatter: baseFrontmatter,
      homepageInspection: {
        contentType: 'text/html',
        ok: true,
        status: 200,
        text: 'Example is a developer platform.',
        url: 'https://example.com'
      },
      llmsInspection: {
        contentType: null,
        error: 'fetch failed',
        ok: false,
        text: '',
        url: 'https://example.com/llms.txt'
      }
    })

    expect(result.guidelineStatus).toBe('fail')
    expect(result.policyEligible).toBe(false)
    expect(result.guidelineReasons).toContain('llms.txt is not accessible (fetch failed).')
  })

  it('warns when category signals do not match the submitted content', () => {
    const result = assessSubmissionGuidelines({
      frontmatter: {
        ...baseFrontmatter,
        category: 'security-identity'
      },
      homepageInspection: {
        contentType: 'text/html',
        ok: true,
        status: 200,
        text: 'We are a digital agency providing consulting services for local businesses.',
        url: 'https://example.com'
      },
      llmsInspection: {
        contentType: 'text/plain',
        ok: true,
        status: 200,
        text: 'We provide consulting services and agency work for clients.'.repeat(4),
        url: 'https://example.com/llms.txt'
      }
    })

    expect(result.guidelineStatus).toBe('warn')
    expect(result.policyEligible).toBe(false)
    expect(result.guidelineReasons.join(' ')).toContain('service-oriented')
  })
})

describe('deriveStructuralDecision', () => {
  const classification = {
    automergeEligible: true,
    labels: ['lane:mdx-fast', 'risk:low', 'automerge:candidate'],
    lane: 'mdx-fast' as const,
    manualWebsitesJsonChange: false,
    reason: 'PR only adds new .mdx entries under packages/content/data/websites/**.',
    risk: 'low' as const,
    stats: {
      fileCount: 1,
      totalChanges: 25,
      touchesWebsitesJson: false
    },
    summary: 'summary'
  }

  it('returns true when the PR satisfies the structural auto-merge gates', () => {
    const result = deriveStructuralDecision({
      classification,
      isDraft: false,
      mergeable: true,
      reviewStatus: 'success',
      state: 'open'
    })

    expect(result).toEqual({
      reason: 'Structural checks passed.',
      structurallyEligible: true
    })
  })

  it('returns false when the PR Review workflow has not succeeded', () => {
    const result = deriveStructuralDecision({
      classification,
      isDraft: false,
      mergeable: true,
      reviewStatus: 'failure',
      state: 'open'
    })

    expect(result).toEqual({
      reason: 'Latest PR Review status is failure.',
      structurallyEligible: false
    })
  })
})

describe('deriveWouldMergeDecision', () => {
  it('blocks when guideline review raises a concern even after structural success', () => {
    const result = deriveWouldMergeDecision({
      guidelineReasons: ['Category "personal" requires manual review for auto-merge.'],
      guidelineStatus: 'warn',
      structuralDecision: {
        reason: 'Structural checks passed.',
        structurallyEligible: true
      }
    })

    expect(result).toEqual({
      policyEligible: false,
      reason: 'Manual review: Category "personal" requires manual review for auto-merge.',
      wouldMerge: false
    })
  })

  it('returns true only when both structural and guideline checks pass', () => {
    const result = deriveWouldMergeDecision({
      guidelineReasons: ['No guideline concerns detected.'],
      guidelineStatus: 'pass',
      structuralDecision: {
        reason: 'Structural checks passed.',
        structurallyEligible: true
      }
    })

    expect(result).toEqual({
      policyEligible: true,
      reason: 'Would auto-merge now.',
      wouldMerge: true
    })
  })

  it('keeps a structurally blocked PR blocked regardless of guideline status', () => {
    const result = deriveWouldMergeDecision({
      guidelineReasons: ['No guideline concerns detected.'],
      guidelineStatus: 'pass',
      structuralDecision: {
        reason: 'Latest PR Review status is missing.',
        structurallyEligible: false
      }
    })

    expect(result).toEqual({
      policyEligible: false,
      reason: 'Latest PR Review status is missing.',
      wouldMerge: false
    })
  })
})
