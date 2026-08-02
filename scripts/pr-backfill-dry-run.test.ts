import { createHash } from 'node:crypto'
import { readFileSync } from 'node:fs'
import { createAssessmentAttestation } from '@thedaviddias/submission-trust/attestation'
import { SUBMISSION_POLICY_VERSION } from '@thedaviddias/submission-trust/constants'
import type {
  InspectedResource,
  PublicationAssessmentDependencies,
  ResourceInspectionResult,
  SubmissionAssessment
} from '@thedaviddias/submission-trust/types'
import { describe, expect, it, vi } from 'vitest'
import {
  assessSubmissionGuidelines,
  buildClassifierContext,
  buildOpenPullRequestDuplicateIndex,
  calculateManagedLabelSync,
  deriveAuthorizationManagedLabels,
  deriveAutomergeEventContext,
  deriveExactHeadMergeDecision,
  deriveImmutablePullRequestManifest,
  deriveManagedLabels,
  deriveMergeAction,
  deriveMergeAuthorization,
  deriveStructuralDecision,
  deriveTrustedBaseStatus,
  deriveWouldMergeDecision,
  inspectOpenPullRequestDuplicates,
  inspectTrustedBaseDuplicate,
  lookupOpenPullRequestDuplicate,
  parseSubmissionFrontmatter,
  runFinalMergeSequence,
  runTrustedAssessmentGate,
  selectTrustedReviewConclusion,
  verifyMergeAttestation
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
  const frontmatterWithLlmsFullUrl = (llmsFullUrlLine: string): string => `---
name: 'Example'
description: 'Example is a developer platform with API docs for AI agents.'
website: 'https://example.com'
llmsUrl: 'https://example.com/llms.txt'
${llmsFullUrlLine}
category: 'developer-tools'
publishedAt: '2026-03-14'
---

# Example
`

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

  it.each([
    ['number', 'llmsFullUrl: 42'],
    ['boolean', 'llmsFullUrl: true'],
    ['array', "llmsFullUrl: ['https://example.com/llms-full.txt']"],
    ['object', "llmsFullUrl: { url: 'https://example.com/llms-full.txt' }"]
  ])('fails closed for a present non-string optional URL: %s', (_label, llmsFullUrlLine) => {
    expect(() => parseSubmissionFrontmatter(frontmatterWithLlmsFullUrl(llmsFullUrlLine))).toThrow(
      'Invalid optional frontmatter field "llmsFullUrl". Expected a string.'
    )
  })

  it.each([
    ['missing', ''],
    ['null', 'llmsFullUrl: null'],
    ['empty string', "llmsFullUrl: ''"]
  ])('treats only an absent optional URL as absent: %s', (_label, llmsFullUrlLine) => {
    expect(
      parseSubmissionFrontmatter(frontmatterWithLlmsFullUrl(llmsFullUrlLine)).llmsFullUrl
    ).toBeNull()
  })
})

describe('assessSubmissionGuidelines', () => {
  const checkedAt = '2026-08-01T12:00:00.000Z'
  const baseFrontmatter = {
    category: 'developer-tools',
    description: 'Example is a developer platform with API documentation for AI agents.',
    llmsFullUrl: '',
    llmsUrl: 'https://example.com/llms.txt',
    name: 'Example',
    website: 'https://example.com'
  }

  const resource = (
    requestedUrl: string,
    overrides: Partial<InspectedResource> = {}
  ): ResourceInspectionResult => {
    const safe = { checkedAt, status: 'safe' } as const
    return {
      ok: true,
      resource: {
        body: requestedUrl.endsWith('.txt')
          ? `# Example\n\n${'Developer API documentation, SDK usage, and integration guides. '.repeat(3)}https://example.com/docs`
          : `<html><body>${'Example developer platform with API docs and SDK references. '.repeat(3)}</body></html>`,
        byteCount: 256,
        contentType: requestedUrl.endsWith('.txt') ? 'text/plain' : 'text/html',
        finalUrl: requestedUrl,
        redirectUrls: [],
        reputation: safe,
        reputationChecks: [{ reputation: safe, url: requestedUrl }],
        requestedUrl,
        statusCode: 200,
        ...overrides
      }
    }
  }

  const inspectResource: PublicationAssessmentDependencies['inspectResource'] = async url =>
    resource(url)
  const inspectText =
    (text: string): PublicationAssessmentDependencies['inspectResource'] =>
    async url =>
      resource(url, {
        body: url.endsWith('.txt')
          ? `# Example\n\n${`${text} `.repeat(3)}https://example.com/about`
          : `<html><body>${`${text} `.repeat(3)}</body></html>`
      })

  it('passes a structurally safe tool submission with matching signals', async () => {
    const result = await assessSubmissionGuidelines({
      frontmatter: baseFrontmatter,
      inspectResource,
      now: () => new Date(checkedAt)
    })

    expect(result).toEqual({
      guidelineReasons: ['No guideline concerns detected.'],
      guidelineStatus: 'pass',
      policyEligible: true
    })
  })

  it('preserves a plausible non-tool category as a passing guideline result', async () => {
    const result = await assessSubmissionGuidelines({
      frontmatter: {
        ...baseFrontmatter,
        category: 'personal',
        description: 'Example is a personal website, portfolio, and developer blog.'
      },
      inspectResource: inspectText('Example is a personal website, portfolio, and developer blog.'),
      now: () => new Date(checkedAt)
    })

    expect(result.guidelineStatus).toBe('pass')
    expect(result.policyEligible).toBe(true)
    expect(result.guidelineReasons).toEqual(['No guideline concerns detected.'])
  })

  it('fails when llms.txt is inaccessible', async () => {
    const result = await assessSubmissionGuidelines({
      frontmatter: baseFrontmatter,
      inspectResource: async url =>
        url === baseFrontmatter.llmsUrl
          ? resource(url, { body: '', statusCode: 404 })
          : resource(url),
      now: () => new Date(checkedAt)
    })

    expect(result.guidelineStatus).toBe('fail')
    expect(result.policyEligible).toBe(false)
    expect(result.guidelineReasons[0]).toContain('required site resource')
  })

  it('warns for first-person promotional copy', async () => {
    const result = await assessSubmissionGuidelines({
      frontmatter: {
        ...baseFrontmatter,
        description:
          'We offer developer tools and API services. Contact us today for a free consultation.'
      },
      inspectResource,
      now: () => new Date(checkedAt)
    })

    expect(result.guidelineStatus).toBe('warn')
    expect(result.policyEligible).toBe(false)
    expect(result.guidelineReasons[0]).toContain('maintainer decision')
  })

  it('does not block adult education wording on its own', async () => {
    const result = await assessSubmissionGuidelines({
      frontmatter: {
        ...baseFrontmatter,
        description: 'Example provides developer tools for adult education programs.'
      },
      inspectResource: inspectText(
        'Example provides developer tools for adult education programs and API documentation.'
      ),
      now: () => new Date(checkedAt)
    })

    expect(result.guidelineStatus).toBe('pass')
    expect(result.policyEligible).toBe(true)
  })

  it('fails on an established gambling promotion pattern without leaking it in reasons', async () => {
    const result = await assessSubmissionGuidelines({
      frontmatter: {
        ...baseFrontmatter,
        description: 'Compare casino bonus offers with our gambling affiliate reviews.'
      },
      inspectResource,
      now: () => new Date(checkedAt)
    })

    expect(result.guidelineStatus).toBe('fail')
    expect(result.policyEligible).toBe(false)
    expect(result.guidelineReasons).toEqual([
      'This submission does not meet the directory content policy.'
    ])
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
  it('does not authorize a merge before signed attestation verification exists', () => {
    const result = deriveMergeAction({
      desiredLabels: ['automerge:candidate'],
      dryRun: true,
      wouldMerge: true,
      wouldMergeReason: 'Would auto-merge now.'
    })

    expect(result).toEqual({
      attempted: false,
      mode: 'dry-run',
      reason: 'Automatic merge is disabled until signed attestation verification is available.',
      status: 'skipped'
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

    expect(result).toEqual(['area:content', 'automerge:candidate', 'lane:mdx-fast', 'risk:low'])
  })

  it('downgrades to standard lane and manual review when guidelines warn', () => {
    const result = deriveManagedLabels({
      classification: baseClassification,
      guidelineStatus: 'warn',
      policyEligible: false,
      structurallyEligible: true
    })

    expect(result).toEqual(['area:content', 'lane:mdx-fast', 'needs:manual-review', 'risk:low'])
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

    expect(result).toEqual(['lane:blocked', 'needs:manual-review', 'risk:high', 'status:blocked'])
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

  it('preserves publisher-owned manual review and removes automerge from an unsigned PR', () => {
    const result = calculateManagedLabelSync(
      ['area:content', 'automerge:candidate', 'lane:mdx-fast', 'needs:manual-review', 'risk:low'],
      ['area:content', 'automerge:candidate', 'lane:mdx-fast', 'risk:low']
    )

    expect(result).toEqual({
      added: [],
      desired: ['area:content', 'lane:mdx-fast', 'needs:manual-review', 'risk:low'],
      removed: ['automerge:candidate']
    })
    expect(
      deriveMergeAction({
        desiredLabels: result.desired,
        dryRun: false,
        wouldMerge: true,
        wouldMergeReason: 'Would auto-merge now.'
      })
    ).toMatchObject({ status: 'skipped' })
  })
})

describe('deriveAutomergeEventContext', () => {
  it('resolves pull_request_target and completed PR Review workflow_run events', () => {
    expect(
      deriveAutomergeEventContext('pull_request_target', { pull_request: { number: 42 } })
    ).toEqual({ mode: 'single', prNumber: 42 })
    expect(
      deriveAutomergeEventContext('workflow_run', {
        workflow_run: {
          conclusion: 'success',
          name: 'PR Review',
          pull_requests: [{ number: 42 }]
        }
      })
    ).toEqual({ mode: 'single', prNumber: 42 })
  })

  it('fails closed for unrelated, ambiguous, or unbound workflow runs', () => {
    expect(
      deriveAutomergeEventContext('workflow_run', {
        workflow_run: { conclusion: 'success', name: 'Other', pull_requests: [{ number: 42 }] }
      })
    ).toEqual({ mode: 'skip' })
    expect(
      deriveAutomergeEventContext('workflow_run', {
        workflow_run: {
          conclusion: 'success',
          name: 'PR Review',
          pull_requests: [{ number: 42 }, { number: 43 }]
        }
      })
    ).toEqual({ mode: 'skip' })
    expect(
      deriveAutomergeEventContext('workflow_run', {
        workflow_run: { conclusion: 'success', name: 'PR Review', pull_requests: [] }
      })
    ).toEqual({ mode: 'skip' })
  })

  it('supports explicit dispatch PRs and deliberate all-open scans only', () => {
    expect(
      deriveAutomergeEventContext('workflow_dispatch', { inputs: { pr_number: '42' } })
    ).toEqual({ mode: 'single', prNumber: 42 })
    expect(deriveAutomergeEventContext('workflow_dispatch', { inputs: { pr_number: '' } })).toEqual(
      {
        mode: 'scan_all'
      }
    )
    expect(deriveAutomergeEventContext('workflow_run', {})).toEqual({ mode: 'skip' })
  })
})

describe('trusted base snapshot proof', () => {
  const baseSha = 'b'.repeat(40)

  it('accepts only equality between checkout, PR base, and live base branch', () => {
    expect(
      deriveTrustedBaseStatus({
        checkedOutSha: baseSha,
        currentBaseSha: baseSha,
        pullRequestBaseSha: baseSha
      })
    ).toBe('current')
  })

  it.each([
    ['base moved after checkout', { currentBaseSha: 'c'.repeat(40) }],
    ['PR base snapshot differs', { pullRequestBaseSha: 'c'.repeat(40) }],
    ['missing checkout proof', { checkedOutSha: '' }]
  ])('fails closed when %s', (_label, overrides) => {
    expect(
      deriveTrustedBaseStatus({
        checkedOutSha: baseSha,
        currentBaseSha: baseSha,
        pullRequestBaseSha: baseSha,
        ...overrides
      })
    ).not.toBe('current')
  })
})

describe('inspectTrustedBaseDuplicate', () => {
  const candidate = {
    llmsUrl: 'https://example.com/llms.txt',
    website: 'https://example.com/'
  }
  const entry = (website = 'https://other.example/'): Uint8Array =>
    new TextEncoder().encode(`---
website: '${website}'
llmsUrl: '${website}llms.txt'
---
`)
  const dependencies = (input: {
    complete?: boolean
    files?: readonly { path: string; bytes: Uint8Array; size?: number }[]
    now?: () => number
  }) => {
    const files = input.files ?? [
      { bytes: entry(), path: 'packages/content/data/websites/other-llms-txt.mdx' }
    ]
    return {
      listFiles: vi.fn(async () => ({
        complete: input.complete ?? true,
        paths: files.map(file => file.path)
      })),
      now: input.now ?? (() => 0),
      readFile: vi.fn(async (path: string) => {
        const file = files.find(value => value.path === path)
        if (!file) throw new Error('missing test file')
        return file.bytes
      }),
      statFile: vi.fn(async (path: string) => {
        const file = files.find(value => value.path === path)
        if (!file) throw new Error('missing test file')
        return { size: file.size ?? file.bytes.byteLength }
      })
    }
  }

  it('recursively inspects a nested base entry and detects a duplicate', async () => {
    const nested = {
      bytes: entry('https://example.com/'),
      path: 'packages/content/data/websites/nested/example-llms-txt.mdx'
    }
    const seams = dependencies({ files: [nested] })

    await expect(inspectTrustedBaseDuplicate(candidate, seams)).resolves.toBe('duplicate')
    expect(seams.readFile).toHaveBeenCalledWith(nested.path)
  })

  it('rejects truncated listings before stat or read', async () => {
    const seams = dependencies({ complete: false })

    await expect(inspectTrustedBaseDuplicate(candidate, seams)).resolves.toBe('unavailable')
    expect(seams.statFile).not.toHaveBeenCalled()
    expect(seams.readFile).not.toHaveBeenCalled()
  })

  it('rejects file-count overflow before stat or read', async () => {
    const files = Array.from({ length: 5001 }, (_, index) => ({
      bytes: entry(),
      path: `packages/content/data/websites/site-${index}-llms-txt.mdx`
    }))
    const seams = dependencies({ files })

    await expect(inspectTrustedBaseDuplicate(candidate, seams)).resolves.toBe('unavailable')
    expect(seams.statFile).not.toHaveBeenCalled()
    expect(seams.readFile).not.toHaveBeenCalled()
  })

  it('rejects oversized individual files before reading', async () => {
    const seams = dependencies({
      files: [
        {
          bytes: entry(),
          path: 'packages/content/data/websites/large-llms-txt.mdx',
          size: 100_001
        }
      ]
    })

    await expect(inspectTrustedBaseDuplicate(candidate, seams)).resolves.toBe('unavailable')
    expect(seams.readFile).not.toHaveBeenCalled()
  })

  it('rejects aggregate-byte overflow before reading', async () => {
    const files = Array.from({ length: 3000 }, (_, index) => ({
      bytes: entry(),
      path: `packages/content/data/websites/site-${index}-llms-txt.mdx`,
      size: 100_000
    }))
    const seams = dependencies({ files })

    await expect(inspectTrustedBaseDuplicate(candidate, seams)).resolves.toBe('unavailable')
    expect(seams.readFile).not.toHaveBeenCalled()
  })

  it('rejects a scan that exceeds its total deadline', async () => {
    let calls = 0
    const seams = dependencies({
      now: () => {
        calls += 1
        return calls === 1 ? 0 : 20_001
      }
    })

    await expect(inspectTrustedBaseDuplicate(candidate, seams)).resolves.toBe('unavailable')
    expect(seams.readFile).not.toHaveBeenCalled()
  })
})

describe('inspectOpenPullRequestDuplicates', () => {
  it('retrieves exact MDX bytes from a fork repository and detects the duplicate', async () => {
    const getFileContent = vi.fn(
      async () => `---
website: 'https://example.com/'
llmsUrl: 'https://example.com/llms.txt'
---
`
    )
    const result = await inspectOpenPullRequestDuplicates(
      {
        candidate: {
          llmsUrl: 'https://example.com/llms.txt',
          website: 'https://example.com/'
        },
        currentPrNumber: 42
      },
      {
        getFileContent,
        listOpenPullRequests: async page =>
          page === 1
            ? [
                {
                  baseSha: 'b'.repeat(40),
                  headRepository: 'contributor/llms-txt-hub',
                  headSha: 'c'.repeat(40),
                  number: 43
                }
              ]
            : [],
        loadImmutableManifest: async () => ({
          files: [
            {
              path: 'packages/content/data/websites/nested/example-llms-txt.mdx',
              status: 'added'
            }
          ],
          status: 'complete'
        })
      }
    )

    expect(result).toBe('duplicate')
    expect(getFileContent).toHaveBeenCalledWith(
      'contributor/llms-txt-hub',
      'packages/content/data/websites/nested/example-llms-txt.mdx',
      'c'.repeat(40)
    )
  })

  it('fails closed when an open-PR page budget is exhausted', async () => {
    await expect(
      inspectOpenPullRequestDuplicates(
        {
          candidate: {
            llmsUrl: 'https://example.com/llms.txt',
            website: 'https://example.com/'
          },
          currentPrNumber: 42
        },
        {
          getFileContent: async () => '',
          listOpenPullRequests: async () =>
            Array.from({ length: 100 }, (_, index) => ({
              baseSha: 'b'.repeat(40),
              headRepository: 'contributor/llms-txt-hub',
              headSha: 'c'.repeat(40),
              number: index + 100
            })),
          loadImmutableManifest: async () => ({ files: [], status: 'complete' })
        }
      )
    ).resolves.toBe('unavailable')
  })

  it('builds one immutable duplicate index and reuses it across candidates', async () => {
    const loadImmutableManifest = vi.fn(async () => ({
      files: [
        {
          path: 'packages/content/data/websites/example-llms-txt.mdx',
          status: 'added'
        }
      ],
      status: 'complete' satisfies 'complete'
    }))
    const index = await buildOpenPullRequestDuplicateIndex(
      [
        {
          baseSha: 'b'.repeat(40),
          headRepository: 'contributor/llms-txt-hub',
          headSha: 'c'.repeat(40),
          number: 43
        }
      ],
      {
        getFileContent: async () => `---
website: 'https://example.com/'
llmsUrl: 'https://example.com/llms.txt'
---
`,
        loadImmutableManifest
      }
    )

    expect(
      lookupOpenPullRequestDuplicate(index, {
        candidate: {
          llmsUrl: 'https://example.com/llms.txt',
          website: 'https://example.com/'
        },
        currentPrNumber: 42
      })
    ).toBe('duplicate')
    expect(
      lookupOpenPullRequestDuplicate(index, {
        candidate: {
          llmsUrl: 'https://other.example/llms.txt',
          website: 'https://other.example/'
        },
        currentPrNumber: 42
      })
    ).toBe('unique')
    expect(loadImmutableManifest).toHaveBeenCalledTimes(1)
  })
})

describe('immutable pull request manifests', () => {
  const baseSha = 'b'.repeat(40)
  const headSha = 'c'.repeat(40)
  const response = {
    ahead_by: 1,
    base_commit: { sha: baseSha },
    commits: [{ sha: headSha }],
    files: [
      {
        additions: 10,
        changes: 10,
        deletions: 0,
        filename: 'packages/content/data/websites/example-llms-txt.mdx',
        status: 'added'
      }
    ],
    status: 'ahead',
    total_commits: 1
  }

  it('binds a complete manifest to exact immutable base and head SHAs', () => {
    expect(deriveImmutablePullRequestManifest(response, { baseSha, headSha })).toEqual({
      files: response.files,
      status: 'complete'
    })
  })

  it.each([
    ['head changed A to B to A during mutable inspection', { commits: [{ sha: 'd'.repeat(40) }] }],
    ['base changed', { base_commit: { sha: 'd'.repeat(40) } }],
    ['commit list truncated', { total_commits: 2 }],
    [
      'file list may be truncated',
      {
        files: Array.from({ length: 300 }, (_, index) => ({
          filename: `file-${index}.mdx`,
          status: 'added'
        }))
      }
    ]
  ])('fails closed when %s', (_label, overrides) => {
    expect(
      deriveImmutablePullRequestManifest({ ...response, ...overrides }, { baseSha, headSha })
    ).toEqual({ status: 'unavailable' })
  })

  it('never uses mutable PR files or commits endpoints in production authorization', () => {
    const source = readFileSync('scripts/pr-backfill-dry-run.ts', 'utf8')
    expect(source).not.toContain('/files`')
    expect(source).not.toContain('/commits`')
  })
})

describe('cheap attestation gate', () => {
  it.each([
    ['invalid attestation', { addedMdxCount: 1, attestationVerified: false }],
    ['multiple changed files', { addedMdxCount: 2, attestationVerified: true }]
  ])('never calls outbound assessment for %s', async (_label, input) => {
    const assess = vi.fn(async () => 'assessed')
    await expect(runTrustedAssessmentGate(input, assess)).resolves.toBeNull()
    expect(assess).not.toHaveBeenCalled()
  })

  it('assesses only one exact attested MDX entry', async () => {
    const assess = vi.fn(async () => 'assessed')
    await expect(
      runTrustedAssessmentGate({ addedMdxCount: 1, attestationVerified: true }, assess)
    ).resolves.toBe('assessed')
    expect(assess).toHaveBeenCalledTimes(1)
  })
})

describe('trusted PR Review identity', () => {
  const baseSha = 'b'.repeat(40)
  const headSha = 'c'.repeat(40)
  const run = {
    conclusion: 'success',
    created_at: '2026-08-02T12:00:00.000Z',
    head_sha: headSha,
    pull_requests: [{ base: { ref: 'main', sha: baseSha }, number: 42 }],
    status: 'completed',
    workflow_id: 123
  }

  it('accepts only the trusted workflow bound to PR, head, and canonical base', () => {
    expect(
      selectTrustedReviewConclusion([run], {
        baseRef: 'main',
        baseSha,
        headSha,
        prNumber: 42,
        workflowId: 123
      })
    ).toBe('success')
  })

  it.each([
    [
      'same head on another PR',
      { pull_requests: [{ base: { ref: 'main', sha: baseSha }, number: 43 }] }
    ],
    ['different workflow identity', { workflow_id: 456 }],
    [
      'stale base run',
      { pull_requests: [{ base: { ref: 'main', sha: 'd'.repeat(40) }, number: 42 }] }
    ],
    [
      'non-canonical base',
      { pull_requests: [{ base: { ref: 'develop', sha: baseSha }, number: 42 }] }
    ]
  ])('rejects %s', (_label, overrides) => {
    expect(
      selectTrustedReviewConclusion([{ ...run, ...overrides }], {
        baseRef: 'main',
        baseSha,
        headSha,
        prNumber: 42,
        workflowId: 123
      })
    ).toBe('missing')
  })
})

describe('final merge orchestration order', () => {
  it('refreshes expensive evidence before the final PR read and performs no API call before merge', async () => {
    const calls: string[] = []
    await expect(
      runFinalMergeSequence({
        authorize: prepared => {
          calls.push('pure-authorization')
          return prepared === 'ready'
        },
        fetchLatest: async () => {
          calls.push('latest-details')
          return { body: 'signed', labels: [], sha: 'a'.repeat(40) }
        },
        isAuthorized: decision => decision,
        merge: async () => {
          calls.push('merge')
        },
        prepareExpensive: async () => {
          calls.push('fresh-open-index')
          calls.push('current-check')
          calls.push('current-base-and-manifest')
          return 'ready'
        }
      })
    ).resolves.toBe(true)
    expect(calls).toEqual([
      'fresh-open-index',
      'current-check',
      'current-base-and-manifest',
      'latest-details',
      'pure-authorization',
      'merge'
    ])
  })

  it.each([
    [
      'open set or head changed during the earlier scan',
      { duplicate: true, latestBody: 'signed', manual: false }
    ],
    [
      'manual label added during the earlier scan',
      { duplicate: false, latestBody: 'signed', manual: true }
    ],
    [
      'PR body changed during the earlier scan',
      { duplicate: false, latestBody: 'changed', manual: false }
    ]
  ])('does not merge when %s', async (_label, scenario) => {
    const calls: string[] = []
    const merge = vi.fn(async () => {
      calls.push('merge')
    })
    await expect(
      runFinalMergeSequence({
        authorize: (prepared, latest) => {
          calls.push('pure-authorization')
          return !prepared.duplicate && !latest.manual && latest.body === 'signed'
        },
        fetchLatest: async () => {
          calls.push('latest-details')
          return { body: scenario.latestBody, manual: scenario.manual }
        },
        isAuthorized: decision => decision,
        merge,
        prepareExpensive: async () => {
          calls.push('fresh-open-index-check-base')
          return { duplicate: scenario.duplicate }
        }
      })
    ).resolves.toBe(false)
    expect(calls).toEqual(['fresh-open-index-check-base', 'latest-details', 'pure-authorization'])
    expect(merge).not.toHaveBeenCalled()
  })
})

describe('trusted merge authorization', () => {
  const repository = 'thedaviddias/llms-txt-hub'
  const prNumber = 42
  const headSha = 'a'.repeat(40)
  const path = 'packages/content/data/websites/example-llms-txt.mdx'
  const secret = 'submission-assessment-secret-with-at-least-32-bytes'
  const webRiskCheckedAt = '2026-08-01T12:00:00.000Z'
  const issuedAt = '2026-08-01T12:04:00.000Z'
  const now = new Date('2026-08-01T12:05:00.000Z')
  const content = `---
category: 'developer-tools'
description: 'Example is a developer platform with API documentation for AI agents.'
llmsFullUrl: ''
llmsUrl: 'https://example.com/llms.txt'
name: 'Example'
publishedAt: '2026-08-01'
website: 'https://example.com'
---

# Example

Example is a developer platform with API documentation for AI agents.
`

  const freshAssessment = (
    overrides: Partial<SubmissionAssessment> = {}
  ): SubmissionAssessment => ({
    checkedAt: now.toISOString(),
    decision: 'auto_publish',
    evidence: [
      {
        check: 'resource',
        decision: 'auto_publish',
        details: { checkedAt: now.toISOString(), providerStatus: 'safe' },
        reasonCode: 'passed',
        resource: 'homepage'
      },
      {
        check: 'resource',
        decision: 'auto_publish',
        details: { checkedAt: now.toISOString(), providerStatus: 'safe' },
        reasonCode: 'passed',
        resource: 'llms'
      }
    ],
    policyVersion: SUBMISSION_POLICY_VERSION,
    publicMessage: 'Passed.',
    reasonCode: 'passed',
    ...overrides
  })

  const signedBody = (
    overrides: {
      expiresAt?: string
      headSha?: string
      mdxContent?: string
      mdxPath?: string
      prNumber?: number
      repository?: string
      webRiskCheckedAt?: string
    } = {}
  ): string => {
    const mdxContent = overrides.mdxContent ?? content
    const hash = createHash('sha256').update(new TextEncoder().encode(mdxContent)).digest('hex')
    const result = createAssessmentAttestation(
      {
        decision: 'auto_publish',
        expiresAt: overrides.expiresAt ?? '2026-08-01T12:10:00.000Z',
        headSha: overrides.headSha ?? headSha,
        issuedAt,
        llmsUrl: 'https://example.com/llms.txt',
        mdxContentSha256: hash,
        mdxPath: overrides.mdxPath ?? path,
        policyVersion: SUBMISSION_POLICY_VERSION,
        prNumber: overrides.prNumber ?? prNumber,
        repository: overrides.repository ?? repository,
        submissionId: 'submission-123',
        webRiskCheckedAt: overrides.webRiskCheckedAt ?? webRiskCheckedAt,
        website: 'https://example.com'
      },
      secret
    )
    if (!result.ok) throw new Error(`Unable to create test attestation: ${result.code}`)
    return `Submission\n\n${result.block}`
  }

  const tamperedBody = (): string => {
    const body = signedBody()
    const signatureEnd = body.indexOf('\n-->')
    const index = signatureEnd - 1
    const replacement = body[index] === 'A' ? 'B' : 'A'
    return `${body.slice(0, index)}${replacement}${body.slice(index + 1)}`
  }

  const verified = () =>
    verifyMergeAttestation({
      addedMdxBytes: new TextEncoder().encode(content),
      addedMdxPath: path,
      body: signedBody(),
      currentHeadSha: headSha,
      now: () => now,
      prNumber,
      repository,
      secret
    })

  const staleVerified = () => {
    const result = verified()
    if (!result.ok) throw new Error('Expected a verified test attestation.')
    return {
      ok: true,
      payload: {
        ...result.payload,
        expiresAt: '2026-08-01T12:20:00.000Z',
        webRiskCheckedAt: '2026-08-01T11:54:59.999Z'
      }
    } satisfies typeof result
  }

  it('verifies a signature bound to the exact repository, PR, head, path, bytes, and fields', () => {
    expect(verified()).toMatchObject({ ok: true })
  })

  it.each([
    ['missing attestation', { body: 'Unsigned submission' }],
    ['invalid signature', { body: tamperedBody() }],
    ['repository mismatch', { repository: 'attacker/llms-txt-hub' }],
    ['PR mismatch', { prNumber: prNumber + 1 }],
    ['head mismatch', { currentHeadSha: 'b'.repeat(40) }],
    ['path mismatch', { addedMdxPath: 'packages/content/data/websites/other.mdx' }],
    ['content mismatch', { addedMdxBytes: new TextEncoder().encode(`${content}\nchanged`) }],
    ['expired attestation', { now: () => new Date('2026-08-01T12:10:00.000Z') }]
  ])('blocks %s', (_label, overrides) => {
    expect(
      verifyMergeAttestation({
        addedMdxBytes: new TextEncoder().encode(content),
        addedMdxPath: path,
        body: signedBody(),
        currentHeadSha: headSha,
        now: () => now,
        prNumber,
        repository,
        secret,
        ...overrides
      })
    ).toMatchObject({ ok: false })
  })

  it.each([
    ['missing attestation', { attestation: { code: 'missing_block', ok: false } }],
    ['stale signed Web Risk evidence', { attestation: staleVerified() }],
    ['base duplicate', { baseDuplicateStatus: 'duplicate' }],
    ['open PR duplicate', { openPullRequestDuplicateStatus: 'duplicate' }],
    ['unavailable duplicate evidence', { openPullRequestDuplicateStatus: 'unavailable' }],
    ['failed PR Review', { requiredCheckStatus: 'failure' }],
    ['publisher manual-review veto', { hasManualReviewLabel: true }],
    [
      'manual fresh assessment',
      {
        freshAssessment: freshAssessment({
          decision: 'manual_review',
          reasonCode: 'editorial_uncertainty'
        })
      }
    ],
    [
      'stale fresh Web Risk evidence',
      {
        freshAssessment: freshAssessment({
          evidence: [
            {
              check: 'resource',
              decision: 'auto_publish',
              details: {
                checkedAt: '2026-08-01T11:54:59.999Z',
                providerStatus: 'safe'
              },
              reasonCode: 'passed',
              resource: 'homepage'
            },
            {
              check: 'resource',
              decision: 'auto_publish',
              details: { checkedAt: now.toISOString(), providerStatus: 'safe' },
              reasonCode: 'passed',
              resource: 'llms'
            }
          ]
        })
      }
    ]
  ])('blocks authorization for %s', (_label, overrides) => {
    expect(
      deriveMergeAuthorization({
        attestation: verified(),
        baseDuplicateStatus: 'unique',
        baseSnapshotStatus: 'current',
        freshAssessment: freshAssessment(),
        hasManualReviewLabel: false,
        now: () => now,
        openPullRequestDuplicateStatus: 'unique',
        requiredCheckStatus: 'success',
        ...overrides
      })
    ).toMatchObject({ authorized: false, disposition: 'manual_review' })
  })

  it('authorizes only a signed exact-head submission with fresh unique evidence and checks', () => {
    expect(
      deriveMergeAuthorization({
        attestation: verified(),
        baseDuplicateStatus: 'unique',
        baseSnapshotStatus: 'current',
        freshAssessment: freshAssessment(),
        hasManualReviewLabel: false,
        now: () => now,
        openPullRequestDuplicateStatus: 'unique',
        requiredCheckStatus: 'success'
      })
    ).toEqual({ authorized: true, reason: 'Signed exact-head assessment passed.' })
  })

  it('plans an exact-head squash only from positive authorization', () => {
    const authorization = deriveMergeAuthorization({
      attestation: verified(),
      baseDuplicateStatus: 'unique',
      baseSnapshotStatus: 'current',
      freshAssessment: freshAssessment(),
      hasManualReviewLabel: false,
      now: () => now,
      openPullRequestDuplicateStatus: 'unique',
      requiredCheckStatus: 'success'
    })

    expect(
      deriveMergeAction({
        authorization,
        desiredLabels: ['automerge:candidate'],
        dryRun: false,
        wouldMerge: true,
        wouldMergeReason: 'Would auto-merge now.'
      })
    ).toEqual({
      attempted: true,
      mode: 'applied',
      reason: 'Signed exact-head assessment passed.',
      status: 'planned'
    })
  })

  it('waits without adding manual review while PR Review is pending', () => {
    const pending = deriveMergeAuthorization({
      attestation: verified(),
      baseDuplicateStatus: 'unique',
      baseSnapshotStatus: 'current',
      freshAssessment: freshAssessment(),
      hasManualReviewLabel: false,
      now: () => now,
      openPullRequestDuplicateStatus: 'unique',
      requiredCheckStatus: 'in_progress'
    })
    expect(pending).toMatchObject({ authorized: false, disposition: 'wait' })
    const waitingLabels = deriveAuthorizationManagedLabels({
      authorization: pending,
      policyLabels: ['area:content', 'automerge:candidate', 'lane:mdx-fast', 'risk:low']
    })
    expect(waitingLabels).toEqual(['area:content', 'lane:mdx-fast', 'risk:low'])
    expect(
      calculateManagedLabelSync(
        ['area:content', 'automerge:candidate', 'lane:mdx-fast', 'risk:low'],
        waitingLabels
      )
    ).toMatchObject({ added: [], removed: ['automerge:candidate'] })
  })

  it('keeps manual review sticky until a human explicitly removes it', () => {
    const vetoed = deriveMergeAuthorization({
      attestation: verified(),
      baseDuplicateStatus: 'unique',
      baseSnapshotStatus: 'current',
      freshAssessment: freshAssessment(),
      hasManualReviewLabel: true,
      now: () => now,
      openPullRequestDuplicateStatus: 'unique',
      requiredCheckStatus: 'success'
    })
    expect(vetoed).toMatchObject({ authorized: false, disposition: 'manual_review' })
    const vetoedLabels = deriveAuthorizationManagedLabels({
      authorization: vetoed,
      policyLabels: ['area:content', 'automerge:candidate', 'lane:mdx-fast', 'risk:low']
    })
    expect(
      calculateManagedLabelSync(
        ['area:content', 'lane:mdx-fast', 'needs:manual-review', 'risk:low'],
        vetoedLabels
      )
    ).toEqual({
      added: [],
      desired: ['area:content', 'lane:mdx-fast', 'needs:manual-review', 'risk:low'],
      removed: []
    })

    const recoveredAfterExplicitUnlabel = deriveMergeAuthorization({
      attestation: verified(),
      baseDuplicateStatus: 'unique',
      baseSnapshotStatus: 'current',
      freshAssessment: freshAssessment(),
      hasManualReviewLabel: false,
      now: () => now,
      openPullRequestDuplicateStatus: 'unique',
      requiredCheckStatus: 'success'
    })
    const recoveredLabels = deriveAuthorizationManagedLabels({
      authorization: recoveredAfterExplicitUnlabel,
      policyLabels: ['area:content', 'automerge:candidate', 'lane:mdx-fast', 'risk:low']
    })
    expect(
      calculateManagedLabelSync(['area:content', 'lane:mdx-fast', 'risk:low'], recoveredLabels)
    ).toEqual({
      added: ['automerge:candidate'],
      desired: ['area:content', 'automerge:candidate', 'lane:mdx-fast', 'risk:low'],
      removed: []
    })
  })

  it('blocks when manual review is added after initial authorization but before merge', () => {
    const initiallyAuthorized = deriveMergeAuthorization({
      attestation: verified(),
      baseDuplicateStatus: 'unique',
      baseSnapshotStatus: 'current',
      freshAssessment: freshAssessment(),
      hasManualReviewLabel: false,
      now: () => now,
      openPullRequestDuplicateStatus: 'unique',
      requiredCheckStatus: 'success'
    })
    expect(initiallyAuthorized).toMatchObject({ authorized: true })

    const latestAuthorization = deriveMergeAuthorization({
      attestation: verified(),
      baseDuplicateStatus: 'unique',
      baseSnapshotStatus: 'current',
      freshAssessment: freshAssessment(),
      hasManualReviewLabel: true,
      now: () => now,
      openPullRequestDuplicateStatus: 'unique',
      requiredCheckStatus: 'success'
    })
    expect(
      deriveExactHeadMergeDecision({
        authorization: latestAuthorization,
        baseSnapshotStatus: 'current',
        currentHeadSha: headSha,
        expectedHeadSha: headSha,
        requiredCheckStatus: 'success'
      })
    ).toMatchObject({ authorized: false, disposition: 'manual_review' })
  })

  it.each(['missing', 'in_progress'] as const)(
    'returns a wait outcome while PR Review is %s',
    requiredCheckStatus => {
      expect(
        deriveMergeAuthorization({
          attestation: verified(),
          baseDuplicateStatus: 'unique',
          baseSnapshotStatus: 'current',
          freshAssessment: freshAssessment(),
          hasManualReviewLabel: false,
          now: () => now,
          openPullRequestDuplicateStatus: 'unique',
          requiredCheckStatus
        })
      ).toMatchObject({ authorized: false, disposition: 'wait' })
    }
  )

  it('waits when the trusted base moved after checkout', () => {
    expect(
      deriveMergeAuthorization({
        attestation: verified(),
        baseDuplicateStatus: 'unique',
        baseSnapshotStatus: 'moved',
        freshAssessment: freshAssessment(),
        hasManualReviewLabel: false,
        now: () => now,
        openPullRequestDuplicateStatus: 'unique',
        requiredCheckStatus: 'success'
      })
    ).toMatchObject({ authorized: false, disposition: 'wait' })
  })

  it('blocks the merge when the head or PR Review changes after authorization', () => {
    expect(
      deriveExactHeadMergeDecision({
        authorization: { authorized: true, reason: 'Signed exact-head assessment passed.' },
        baseSnapshotStatus: 'current',
        currentHeadSha: 'b'.repeat(40),
        expectedHeadSha: headSha,
        requiredCheckStatus: 'success'
      })
    ).toMatchObject({ authorized: false })
    expect(
      deriveExactHeadMergeDecision({
        authorization: { authorized: true, reason: 'Signed exact-head assessment passed.' },
        baseSnapshotStatus: 'current',
        currentHeadSha: headSha,
        expectedHeadSha: headSha,
        requiredCheckStatus: 'failure'
      })
    ).toMatchObject({ authorized: false })
  })

  it('aborts when the base moves between authorization and merge', () => {
    expect(
      deriveExactHeadMergeDecision({
        authorization: { authorized: true, reason: 'Signed exact-head assessment passed.' },
        baseSnapshotStatus: 'moved',
        currentHeadSha: headSha,
        expectedHeadSha: headSha,
        requiredCheckStatus: 'success'
      })
    ).toMatchObject({ authorized: false, disposition: 'wait' })
  })
})

describe('PR Intake manual-label ownership', () => {
  it('preserves manual review and suppresses automerge candidate during inline label sync', () => {
    const workflow = readFileSync('.github/workflows/pr-intake.yml', 'utf8')

    expect(workflow).toContain(
      "const preserveManualReview = currentNames.includes('needs:manual-review')"
    )
    expect(workflow).toContain("labels = labels.filter(label => label !== 'automerge:candidate')")
    expect(workflow).toContain("labels.push('needs:manual-review')")
    expect(workflow).toContain("name !== 'needs:manual-review'")
  })
})

describe('trusted workflow wiring', () => {
  it('runs on every authorization-relevant PR mutation without checking out untrusted code', () => {
    const workflow = readFileSync('.github/workflows/pr-automerge.yml', 'utf8')

    expect(workflow).toContain('labeled')
    expect(workflow).toContain('unlabeled')
    expect(workflow).toContain('edited')
    expect(workflow).toContain('workflow_run:')
    expect(workflow).toContain("workflows: ['PR Review']")
    expect(workflow).toContain('types: [completed]')
    expect(workflow).toContain('Checkout trusted base')
    expect(workflow).not.toContain('github.event.pull_request.head.sha')
    expect(workflow).not.toContain('github.event.pull_request.head.repo')
  })

  it('scopes both trust secrets to the trusted validation step', () => {
    const workflow = readFileSync('.github/workflows/pr-automerge.yml', 'utf8')
    const validationStep = workflow.slice(workflow.indexOf('- name: Validate, label'))

    expect(validationStep).toContain('GOOGLE_WEB_RISK_API_KEY:')
    expect(validationStep).toContain('SUBMISSION_ASSESSMENT_SIGNING_SECRET:')
    expect(workflow.slice(0, workflow.indexOf('- name: Validate, label'))).not.toContain(
      'SUBMISSION_ASSESSMENT_SIGNING_SECRET:'
    )
  })

  it('uses only the scoped workflow token and pins the credential-free trusted checkout', () => {
    const workflow = readFileSync('.github/workflows/pr-automerge.yml', 'utf8')

    expect(workflow).toContain('actions: read')
    expect(workflow).toContain('Capture trusted base SHA')
    expect(workflow).toContain('TRUSTED_BASE_SHA:')
    expect(workflow).toContain('github.token')
    expect(workflow).not.toContain('PAT_TOKEN')
    expect(workflow).toContain('actions/checkout@de0fac2e4500dabe0009e67214ff5f5447ce83dd')
    expect(workflow).toContain('actions/github-script@ed597411d8f924073f98dfc5c65a23a2325f34cd')
    expect(workflow).toContain('persist-credentials: false')
    expect(workflow).toContain('derive-event-context')
  })

  it('bounds each run and cancels stale work with per-PR concurrency', () => {
    const workflow = readFileSync('.github/workflows/pr-automerge.yml', 'utf8')

    expect(workflow).toContain('cancel-in-progress: true')
    expect(workflow).toContain('github.event.workflow_run.pull_requests[0].number')
    expect(workflow).toContain('timeout-minutes:')
  })
})
