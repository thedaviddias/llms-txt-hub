import { describe, expect, it } from 'vitest'
import {
  assessSubmissionGuidelines,
  buildClassifierContext,
  calculateManagedLabelSync,
  deriveManagedLabels,
  deriveMergeAction,
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

    expect(result.guidelineStatus).toBe('pass')
    expect(result.policyEligible).toBe(true)
    expect(result.guidelineReasons).toEqual(['No guideline concerns detected.'])
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

  it('does not block service-oriented wording on its own anymore', () => {
    const result = assessSubmissionGuidelines({
      frontmatter: baseFrontmatter,
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

    expect(result.guidelineStatus).toBe('pass')
    expect(result.policyEligible).toBe(true)
    expect(result.guidelineReasons).toEqual(['No guideline concerns detected.'])
  })

  it('only fails on the narrowed suspicious-term list', () => {
    const result = assessSubmissionGuidelines({
      frontmatter: {
        ...baseFrontmatter,
        category: 'personal'
      },
      homepageInspection: {
        contentType: 'text/html',
        ok: true,
        status: 200,
        text: 'Adult learning programs for career growth and continuing education.',
        url: 'https://example.com'
      },
      llmsInspection: {
        contentType: 'text/plain',
        ok: true,
        status: 200,
        text: 'Adult education resources and professional development courses.'.repeat(4),
        url: 'https://example.com/llms.txt'
      }
    })

    expect(result.guidelineStatus).toBe('pass')
    expect(result.policyEligible).toBe(true)
  })

  it('still fails on obvious suspicious-site terms', () => {
    const result = assessSubmissionGuidelines({
      frontmatter: baseFrontmatter,
      homepageInspection: {
        contentType: 'text/html',
        ok: true,
        status: 200,
        text: 'This casino platform offers betting, gambling, and bonus promotions.',
        url: 'https://example.com'
      },
      llmsInspection: {
        contentType: 'text/plain',
        ok: true,
        status: 200,
        text: 'Casino betting gambling promotions and slots.'.repeat(4),
        url: 'https://example.com/llms.txt'
      }
    })

    expect(result.guidelineStatus).toBe('fail')
    expect(result.policyEligible).toBe(false)
    expect(result.guidelineReasons.join(' ')).toContain('casino')
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
      state: 'open'
    })

    expect(result).toEqual({
      reason: 'Structural checks passed.',
      structurallyEligible: true
    })
  })

  it('no longer treats PR Review as part of local structural eligibility', () => {
    const result = deriveStructuralDecision({
      classification,
      isDraft: false,
      mergeable: true,
      state: 'open'
    })

    expect(result).toEqual({
      reason: 'Structural checks passed.',
      structurallyEligible: true
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

describe('deriveMergeAction', () => {
  it('plans a merge during dry-run when the PR is eligible', () => {
    const result = deriveMergeAction({
      desiredLabels: ['automerge:candidate'],
      dryRun: true,
      wouldMerge: true,
      wouldMergeReason: 'Would auto-merge now.'
    })

    expect(result).toEqual({
      attempted: true,
      mode: 'dry-run',
      reason: 'Would merge now.',
      status: 'planned'
    })
  })

  it('skips merge when manual review labeling is present', () => {
    const result = deriveMergeAction({
      desiredLabels: ['needs:manual-review'],
      dryRun: false,
      wouldMerge: true,
      wouldMergeReason: 'Would auto-merge now.'
    })

    expect(result).toEqual({
      attempted: false,
      mode: 'applied',
      reason: 'Merge skipped because the PR is labeled for manual review.',
      status: 'skipped'
    })
  })

  it('skips merge when the PR is not eligible', () => {
    const result = deriveMergeAction({
      desiredLabels: ['needs:manual-review'],
      dryRun: false,
      wouldMerge: false,
      wouldMergeReason: 'Latest PR Review status is failure.'
    })

    expect(result).toEqual({
      attempted: false,
      mode: 'applied',
      reason: 'Latest PR Review status is failure.',
      status: 'skipped'
    })
  })
})

describe('deriveManagedLabels', () => {
  const baseClassification = {
    automergeEligible: true,
    labels: ['lane:mdx-fast', 'risk:low', 'automerge:candidate', 'area:content'],
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

  it('keeps fast-lane labels for structurally and policy-eligible PRs', () => {
    const result = deriveManagedLabels({
      classification: baseClassification,
      guidelineStatus: 'pass',
      policyEligible: true,
      structurallyEligible: true
    })

    expect(result).toEqual(['automerge:candidate'])
  })

  it('downgrades to standard lane and manual review when guidelines warn', () => {
    const result = deriveManagedLabels({
      classification: baseClassification,
      guidelineStatus: 'warn',
      policyEligible: false,
      structurallyEligible: true
    })

    expect(result).toEqual(['needs:manual-review'])
  })

  it('uses manual review for structurally blocked PRs', () => {
    const result = deriveManagedLabels({
      classification: {
        ...baseClassification,
        labels: ['lane:blocked', 'risk:high', 'status:blocked'],
        lane: 'blocked',
        risk: 'high'
      },
      guidelineStatus: 'skipped',
      policyEligible: false,
      structurallyEligible: false
    })

    expect(result).toEqual(['needs:manual-review'])
  })

  it('preserves generated websites.json labeling when present', () => {
    const result = deriveManagedLabels({
      classification: {
        ...baseClassification,
        labels: ['generated:websites-json'],
        manualWebsitesJsonChange: true
      },
      guidelineStatus: 'skipped',
      policyEligible: false,
      structurallyEligible: false
    })

    expect(result).toEqual(['generated:websites-json', 'needs:manual-review'])
  })
})

describe('calculateManagedLabelSync', () => {
  it('removes stale managed labels but preserves unrelated labels', () => {
    const result = calculateManagedLabelSync(
      ['area:content', 'guideline:pass', 'lane:mdx-fast', 'risk:low', 'custom:keep'],
      ['needs:manual-review']
    )

    expect(result).toEqual({
      added: ['needs:manual-review'],
      desired: ['needs:manual-review'],
      removed: ['area:content', 'guideline:pass', 'lane:mdx-fast', 'risk:low']
    })
  })
})
