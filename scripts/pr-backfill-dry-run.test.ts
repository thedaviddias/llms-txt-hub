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
import { describe, expect, it } from 'vitest'
import {
  assessSubmissionGuidelines,
  buildClassifierContext,
  calculateManagedLabelSync,
  deriveExactHeadMergeDecision,
  deriveManagedLabels,
  deriveMergeAction,
  deriveMergeAuthorization,
  deriveStructuralDecision,
  deriveWouldMergeDecision,
  parseSubmissionFrontmatter,
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
    ['manual-review label', { hasManualReviewLabel: true }],
    ['base duplicate', { baseDuplicateStatus: 'duplicate' }],
    ['open PR duplicate', { openPullRequestDuplicateStatus: 'duplicate' }],
    ['unavailable duplicate evidence', { openPullRequestDuplicateStatus: 'unavailable' }],
    ['missing PR Review', { requiredChecksPassed: false }],
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
        freshAssessment: freshAssessment(),
        hasManualReviewLabel: false,
        now: () => now,
        openPullRequestDuplicateStatus: 'unique',
        requiredChecksPassed: true,
        ...overrides
      })
    ).toMatchObject({ authorized: false })
  })

  it('authorizes only a signed exact-head submission with fresh unique evidence and checks', () => {
    expect(
      deriveMergeAuthorization({
        attestation: verified(),
        baseDuplicateStatus: 'unique',
        freshAssessment: freshAssessment(),
        hasManualReviewLabel: false,
        now: () => now,
        openPullRequestDuplicateStatus: 'unique',
        requiredChecksPassed: true
      })
    ).toEqual({ authorized: true, reason: 'Signed exact-head assessment passed.' })
  })

  it('plans an exact-head squash only from positive authorization', () => {
    const authorization = deriveMergeAuthorization({
      attestation: verified(),
      baseDuplicateStatus: 'unique',
      freshAssessment: freshAssessment(),
      hasManualReviewLabel: false,
      now: () => now,
      openPullRequestDuplicateStatus: 'unique',
      requiredChecksPassed: true
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

  it('blocks the merge when the head or PR Review changes after authorization', () => {
    expect(
      deriveExactHeadMergeDecision({
        authorization: { authorized: true, reason: 'Signed exact-head assessment passed.' },
        currentHeadSha: 'b'.repeat(40),
        expectedHeadSha: headSha,
        requiredChecksPassed: true
      })
    ).toMatchObject({ authorized: false })
    expect(
      deriveExactHeadMergeDecision({
        authorization: { authorized: true, reason: 'Signed exact-head assessment passed.' },
        currentHeadSha: headSha,
        expectedHeadSha: headSha,
        requiredChecksPassed: false
      })
    ).toMatchObject({ authorized: false })
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
})
