import { readFileSync } from 'node:fs'
import { createAssessmentAttestation } from '@thedaviddias/submission-trust/attestation'
import {
  SUBMISSION_POLICY_VERSION,
  WEB_RISK_FRESHNESS_MS
} from '@thedaviddias/submission-trust/constants'
import type {
  ResourceInspectionResult,
  SubmissionAssessment
} from '@thedaviddias/submission-trust/types'
import { describe, expect, it, vi } from 'vitest'
import {
  deriveMergeAuthorization,
  deriveRevalidatedMergeDecision,
  executeMergeAction,
  main,
  moderatePullRequest,
  parseArgs,
  verifyFinalMergeAttestation
} from './pr-backfill-dry-run.ts'
import { classifyPullRequest } from './pr-triage.ts'

const runtime = vi.hoisted(() => ({
  exec: vi.fn<(command: string, args: string[]) => Promise<{ stdout: string }>>(),
  inspect: vi.fn<(url: string) => Promise<ResourceInspectionResult>>(),
  readFile: vi.fn(),
  stat: vi.fn(),
  glob: vi.fn()
}))

vi.mock('node:child_process', async () => {
  const { promisify } = await import('node:util')
  return { execFile: Object.assign(vi.fn(), { [promisify.custom]: runtime.exec }) }
})
vi.mock('@thedaviddias/submission-trust/network-inspector', () => ({
  createNetworkInspector: () => ({ inspect: runtime.inspect })
}))
vi.mock('node:fs/promises', () => ({ readFile: runtime.readFile, stat: runtime.stat }))
vi.mock('glob', () => ({ glob: runtime.glob }))

const now = new Date('2026-09-08T12:00:00.000Z')
const headSha = 'a'.repeat(40)
const baseSha = 'b'.repeat(40)
const path = 'packages/content/data/websites/example.mdx'
const repo = 'thedaviddias/llms-txt-hub'
const secret = 'test-secret-at-least-thirty-two-bytes-long'
const content = `---
name: 'Example'
description: 'Example is a developer platform with API documentation for AI agents.'
website: 'https://example.com'
llmsUrl: 'https://example.com/llms.txt'
category: 'developer-tools'
publishedAt: '2026-09-08'
---
`
const bytes = new TextEncoder().encode(content)
const files = [{ filename: path, status: 'added' }]
const input = () => ({
  body: 'Add Example developer documentation.',
  classification: classifyPullRequest({
    files,
    commits: [],
    title: 'Add Example',
    authorLogin: 'contributor',
    headRefName: 'add-example'
  }),
  contentRepo: 'contributor/llms-txt-hub',
  directAssessment: {
    enabled: true,
    baseSnapshotStatus: 'current',
    hasManualReviewLabel: false,
    requiredCheckStatus: 'success',
    structurallyEligible: true
  } as const,
  files,
  prNumber: 42,
  repo,
  secret,
  sha: headSha
})
const assessment = (
  overrides: Partial<Omit<SubmissionAssessment, 'decision' | 'reasonCode'>> = {}
): SubmissionAssessment => ({
  checkedAt: now.toISOString(),
  decision: 'auto_publish',
  evidence: ['homepage', 'llms'].map(resource => ({
    check: 'resource',
    decision: 'auto_publish',
    details: { checkedAt: now.toISOString(), providerStatus: 'safe' },
    reasonCode: 'passed',
    resource: resource === 'homepage' ? 'homepage' : 'llms'
  })),
  policyVersion: SUBMISSION_POLICY_VERSION,
  publicMessage: 'Passed.',
  reasonCode: 'passed',
  ...overrides
})
const dependencies = (result = assessment(), fileBytes = bytes) => ({
  assess: vi.fn(async () => result),
  fetchBytes: vi.fn(async () => fileBytes),
  now: () => now
})
const verification = () => ({
  addedMdxBytes: bytes,
  addedMdxPath: path,
  body: input().body,
  currentHeadSha: headSha,
  now: () => now,
  prNumber: 42,
  repository: repo,
  secret
})

describe('opt-in direct PR assessment', () => {
  it('accepts a canonical generated body as well as a frontmatter-only entry', async () => {
    const canonical = `${content}\n# Example\n\nExample is a developer platform with API documentation for AI agents\\.\n`
    const result = await moderatePullRequest(
      input(),
      dependencies(assessment(), new TextEncoder().encode(canonical))
    )
    expect(result.attestation.ok).toBe(true)
    expect(result.ephemeralAttestation).toBeDefined()
  })

  it('assesses a safe unsigned single-file direct PR and signs exact bytes only in memory', async () => {
    const deps = dependencies()
    const result = await moderatePullRequest(input(), deps)

    expect(deps.fetchBytes).toHaveBeenCalledWith('contributor/llms-txt-hub', path, headSha)
    expect(deps.assess).toHaveBeenCalledOnce()
    expect(result.policyEligible).toBe(true)
    expect(result.attestation).toMatchObject({
      ok: true,
      payload: { headSha, prNumber: 42, repository: repo, mdxPath: path }
    })
    expect(result.ephemeralAttestation?.originalBody).toBe(input().body)
    expect(input().body).not.toContain('llms-hub-assessment')
    expect(
      verifyFinalMergeAttestation({
        verification: verification(),
        ephemeralAttestation: result.ephemeralAttestation
      }).ok
    ).toBe(true)
    expect(
      deriveMergeAuthorization({
        attestation: result.attestation,
        baseDuplicateStatus: 'unique',
        baseSnapshotStatus: 'current',
        freshAssessment: assessment(),
        hasManualReviewLabel: false,
        now: () => now,
        openPullRequestDuplicateStatus: 'unique',
        requiredCheckStatus: 'success'
      }).authorized
    ).toBe(true)
  })

  it.each([
    ['no opt-in', { enabled: false }],
    ['manual veto', { hasManualReviewLabel: true }],
    ['ineligible structure', { structurallyEligible: false }],
    ['missing check', { requiredCheckStatus: 'missing' }],
    ['pending check', { requiredCheckStatus: 'in_progress' }],
    ['failed check', { requiredCheckStatus: 'failure' }],
    ['moved base', { baseSnapshotStatus: 'moved' }],
    ['unknown base', { baseSnapshotStatus: 'unavailable' }]
  ] as const)('does not assess or sign with %s', async (_label, override) => {
    const deps = dependencies()
    const result = await moderatePullRequest(
      { ...input(), directAssessment: { ...input().directAssessment, ...override } },
      deps
    )
    expect(deps.assess).not.toHaveBeenCalled()
    expect(result.attestation.ok).toBe(false)
    expect(result.ephemeralAttestation).toBeUndefined()
  })

  it.each(['', 'short'])('does not assess or sign with unavailable signing key %s', async key => {
    const deps = dependencies()
    const result = await moderatePullRequest({ ...input(), secret: key }, deps)
    expect(deps.assess).not.toHaveBeenCalled()
    expect(result.guidelineReasons.join(' ')).toMatch(/signing/i)
    expect(result.ephemeralAttestation).toBeUndefined()
  })

  it.each([
    '<!-- llms-hub-submission:manual-123 -->',
    '<!-- llms-hub-submission:shadow-123 -->',
    '<!-- llms-hub-assessment:v1\nforged\n-->',
    'malformed llms-hub-assessment marker',
    'LLMS-HUB-SUBMISSION:unknown'
  ])('never falls back from web provenance: %s', async body => {
    const deps = dependencies()
    const result = await moderatePullRequest({ ...input(), body }, deps)
    expect(deps.assess).not.toHaveBeenCalled()
    expect(result.ephemeralAttestation).toBeUndefined()
    expect(result.attestation.ok).toBe(false)
  })

  it('rejects more than one changed file before fetching or assessing', async () => {
    const deps = dependencies()
    const result = await moderatePullRequest(
      { ...input(), files: [...files, { filename: 'package.json', status: 'modified' }] },
      deps
    )
    expect(deps.fetchBytes).not.toHaveBeenCalled()
    expect(deps.assess).not.toHaveBeenCalled()
    expect(result.ephemeralAttestation).toBeUndefined()
  })

  it.each(['# Example\n\nUnrecognized Markdown.', '<Component />', '{process.env.SECRET}'])(
    'rejects noncanonical or executable MDX before assessment: %s',
    async body => {
      const deps = dependencies(assessment(), new TextEncoder().encode(`${content}\n${body}\n`))
      const result = await moderatePullRequest(input(), deps)
      expect(deps.assess).not.toHaveBeenCalled()
      expect(result.ephemeralAttestation).toBeUndefined()
      expect(result.attestation.ok).toBe(false)
    }
  )

  it.each([
    ['retry', { ...assessment(), decision: 'retry_later', reasonCode: 'publication_unavailable' }],
    ['manual', { ...assessment(), decision: 'manual_review', reasonCode: 'editorial_uncertainty' }],
    ['no provider evidence', assessment({ evidence: [] })],
    [
      'stale assessment',
      assessment({ checkedAt: new Date(now.getTime() - WEB_RISK_FRESHNESS_MS).toISOString() })
    ],
    ['wrong policy', assessment({ policyVersion: 'old-policy' })]
  ] satisfies [string, SubmissionAssessment][])('does not sign %s', async (_label, overrides) => {
    const result = await moderatePullRequest(input(), dependencies(overrides))
    expect(result.attestation.ok).toBe(false)
    expect(result.ephemeralAttestation).toBeUndefined()
    expect(result.policyEligible).toBe(false)
  })

  it('requires fresh provider evidence for the optional llms-full URL', async () => {
    const fullBytes = new TextEncoder().encode(
      content.replace('llmsUrl:', "llmsFullUrl: 'https://example.com/llms-full.txt'\nllmsUrl:")
    )
    const result = await moderatePullRequest(input(), dependencies(assessment(), fullBytes))
    expect(result.ephemeralAttestation).toBeUndefined()
    expect(result.attestation.ok).toBe(false)
  })

  it('uses the oldest provider check when bounding the in-memory signature lifetime', async () => {
    const older = new Date(now.getTime() - WEB_RISK_FRESHNESS_MS + 1000).toISOString()
    const fresh = assessment()
    const result = await moderatePullRequest(
      input(),
      dependencies(
        assessment({
          evidence: fresh.evidence.map(entry => ({
            ...entry,
            details: { ...entry.details, checkedAt: older }
          }))
        })
      )
    )
    expect(result.attestation).toMatchObject({
      ok: true,
      payload: { webRiskCheckedAt: older, expiresAt: new Date(now.getTime() + 1000).toISOString() }
    })
  })

  it('keeps valid web-signed PRs on the existing signature path', async () => {
    const direct = await moderatePullRequest(input(), dependencies())
    if (!direct.attestation.ok) throw new Error('Expected signed fixture')
    const signed = createAssessmentAttestation(direct.attestation.payload, secret)
    if (!signed.ok) throw new Error('Expected signed fixture')
    const deps = dependencies()
    const result = await moderatePullRequest(
      {
        ...input(),
        body: `<!-- llms-hub-submission:123 -->\n${signed.block}`,
        directAssessment: { ...input().directAssessment, enabled: false }
      },
      deps
    )
    expect(deps.assess).toHaveBeenCalledOnce()
    expect(result.attestation.ok).toBe(true)
    expect(result.ephemeralAttestation).toBeUndefined()
  })

  it('does not re-sign an expired valid signature', async () => {
    const signed = await moderatePullRequest(input(), dependencies())
    const deps = {
      ...dependencies(),
      now: () => new Date(now.getTime() + WEB_RISK_FRESHNESS_MS + 1)
    }
    const result = await moderatePullRequest(
      { ...input(), body: signed.ephemeralAttestation?.block ?? '' },
      deps
    )
    expect(deps.assess).not.toHaveBeenCalled()
    expect(result.ephemeralAttestation).toBeUndefined()
  })
})

describe('direct PR final revalidation', () => {
  it.each([
    ['head', { currentHeadSha: 'c'.repeat(40) }],
    ['bytes', { addedMdxBytes: new TextEncoder().encode(`${content}\n`) }],
    ['path', { addedMdxPath: 'packages/content/data/websites/other.mdx' }],
    ['PR number', { prNumber: 43 }],
    ['repository', { repository: 'other/repo' }],
    ['ordinary body edit', { body: 'changed description' }],
    ['web marker added', { body: '<!-- llms-hub-submission:123 -->' }],
    ['assessment marker added', { body: '<!-- llms-hub-assessment:v1\nforged\n-->' }],
    ['expired signature', { now: () => new Date(now.getTime() + WEB_RISK_FRESHNESS_MS) }],
    ['missing key', { secret: '' }]
  ])('rejects a changed %s', async (_label, change) => {
    const result = await moderatePullRequest(input(), dependencies())
    expect(
      verifyFinalMergeAttestation({
        verification: { ...verification(), ...change },
        ephemeralAttestation: result.ephemeralAttestation
      }).ok
    ).toBe(false)
  })

  const finalInput = async () => {
    const moderated = await moderatePullRequest(input(), dependencies())
    const file = moderated.files[0]
    if (!file) throw new Error('Expected moderated fixture')
    return {
      authorization: { authorized: true, reason: 'Signed exact-head assessment passed.' } as const,
      headSha,
      prNumber: 42,
      repo,
      secret,
      now: () => now,
      revalidation: {
        baseDuplicateStatus: 'unique' as const,
        baseSha,
        duplicateFields: {
          name: 'example',
          website: 'https://example.com/',
          llmsUrl: 'https://example.com/llms.txt'
        },
        ephemeralAttestation: moderated.ephemeralAttestation,
        file,
        freshAssessment: file.assessment,
        headRepository: 'contributor/llms-txt-hub',
        trustedBaseSha: baseSha
      },
      prepared: {
        baseSnapshotStatus: 'current',
        reviewStatus: 'success',
        manifest: { status: 'complete', files },
        openPullRequestDuplicateStatus: 'unique'
      } as const,
      latest: {
        number: 42,
        head: { ref: 'add-example', sha: headSha, repo: { full_name: 'contributor/llms-txt-hub' } },
        base: { ref: 'main', sha: baseSha, repo: { full_name: repo } },
        body: input().body,
        labels: [],
        state: 'open',
        draft: false,
        mergeable: true,
        title: 'Add Example',
        user: { login: 'contributor' }
      }
    }
  }

  it('authorizes the unchanged final snapshot using the ephemeral signature', async () => {
    expect(deriveRevalidatedMergeDecision(await finalInput()).mergeAllowed).toBe(true)
  })

  it.each([
    'head',
    'base',
    'body',
    'manual veto',
    'draft',
    'closed',
    'manifest',
    'CI',
    'base moved',
    'duplicate',
    'base duplicate',
    'freshness'
  ])('denies a final %s change', async scenario => {
    const value = await finalInput()
    if (scenario === 'head') value.latest.head.sha = 'c'.repeat(40)
    if (scenario === 'base') value.latest.base.sha = 'c'.repeat(40)
    if (scenario === 'body') value.latest.body = '<!-- llms-hub-submission:new -->'
    if (scenario === 'draft') value.latest.draft = true
    if (scenario === 'closed') value.latest.state = 'closed'
    if (scenario === 'freshness') value.now = () => new Date(now.getTime() + WEB_RISK_FRESHNESS_MS)
    const decision = deriveRevalidatedMergeDecision({
      ...value,
      latest: {
        ...value.latest,
        labels: scenario === 'manual veto' ? [{ name: 'needs:manual-review' }] : []
      },
      revalidation: {
        ...value.revalidation,
        baseDuplicateStatus: scenario === 'base duplicate' ? 'duplicate' : 'unique'
      },
      prepared: {
        ...value.prepared,
        manifest:
          scenario === 'manifest'
            ? {
                status: 'complete',
                files: [...files, { filename: 'package.json', status: 'modified' }]
              }
            : value.prepared.manifest,
        reviewStatus: scenario === 'CI' ? 'failure' : 'success',
        baseSnapshotStatus: scenario === 'base moved' ? 'moved' : 'current',
        openPullRequestDuplicateStatus: scenario === 'duplicate' ? 'duplicate' : 'unique'
      }
    })
    expect(decision.mergeAllowed).toBe(false)
  })

  it('returns the plan without executing merge or any final GitHub operation in dry-run mode', async () => {
    const value = await finalInput()
    const mergePlan = {
      attempted: true,
      mode: 'dry-run',
      reason: 'Signed exact-head assessment passed.',
      status: 'planned'
    } as const
    const result = await executeMergeAction({
      ...value,
      mergePlan,
      repo: 'invalid/repo-do-not-call'
    })
    expect(result).toEqual(mergePlan)
  })
})

describe('direct PR command wiring', () => {
  it('runs the opted-in dry-run CLI through real assessment and only read-only GitHub commands', async () => {
    const existingBytes = Buffer.from(content.replaceAll('example.com', 'already-listed.dev'))
    runtime.glob.mockResolvedValue(['packages/content/data/websites/already-listed.mdx'])
    runtime.stat.mockResolvedValue({ size: existingBytes.byteLength })
    runtime.readFile.mockResolvedValue(existingBytes)
    runtime.inspect.mockImplementation(async url => {
      const reputation = { status: 'safe', checkedAt: new Date().toISOString() } as const
      const copy =
        'Example developer platform with API documentation, SDK references, and integration guides. '.repeat(
          3
        )
      return {
        ok: true,
        resource: {
          body: url.endsWith('.txt')
            ? `# Example\n\n${copy}https://example.com/docs`
            : `<html><body>${copy}</body></html>`,
          byteCount: 400,
          contentType: url.endsWith('.txt') ? 'text/plain' : 'text/html',
          finalUrl: url,
          redirectUrls: [],
          reputation,
          reputationChecks: [{ reputation, url }],
          requestedUrl: url,
          statusCode: 200
        }
      }
    })
    const details = {
      number: 42,
      body: input().body,
      title: 'Add Example',
      user: { login: 'contributor' },
      draft: false,
      mergeable: true,
      state: 'open',
      labels: [],
      head: { ref: 'add-example', sha: headSha, repo: { full_name: 'contributor/llms-txt-hub' } },
      base: { ref: 'main', sha: baseSha, repo: { full_name: repo } }
    }
    runtime.exec.mockImplementation(async (command, args) => {
      if (command !== 'gh' || args.some(arg => ['--method', '-f', '-F', '--input'].includes(arg))) {
        throw new Error('Mutation or non-GitHub command attempted')
      }
      if (args.join(' ') === 'auth status') return { stdout: '' }
      const endpoint = args[1] ?? ''
      let result: unknown
      if (endpoint === `repos/${repo}/pulls/42`) result = details
      else if (endpoint.startsWith(`repos/${repo}/pulls?`)) result = [details]
      else if (endpoint === `repos/${repo}/compare/${baseSha}...${headSha}`)
        result = {
          ahead_by: 1,
          base_commit: { sha: baseSha },
          commits: [{ sha: headSha }],
          files,
          status: 'ahead',
          total_commits: 1
        }
      else if (endpoint.startsWith('repos/contributor/llms-txt-hub/contents/'))
        result = { content: Buffer.from(bytes).toString('base64'), encoding: 'base64' }
      else if (endpoint === `repos/${repo}/actions/workflows/pr-review.yml`)
        result = { id: 123, path: '.github/workflows/pr-review.yml' }
      else if (endpoint.startsWith(`repos/${repo}/actions/workflows/123/runs?`))
        result = {
          workflow_runs: [
            {
              conclusion: 'success',
              created_at: new Date().toISOString(),
              head_sha: headSha,
              pull_requests: [{ number: 42, base: { ref: 'main', sha: baseSha } }],
              status: 'completed',
              workflow_id: 123
            }
          ]
        }
      else if (endpoint === `repos/${repo}/branches/main`) result = { commit: { sha: baseSha } }
      else if (endpoint.startsWith(`repos/${repo}/issues/42/labels?`)) result = []
      else throw new Error(`Unexpected GitHub endpoint: ${endpoint}`)
      return { stdout: JSON.stringify(result) }
    })
    vi.stubEnv('TRUSTED_BASE_SHA', baseSha)
    vi.stubEnv('SUBMISSION_ASSESSMENT_SIGNING_SECRET', secret)
    const output = vi.spyOn(process.stdout, 'write').mockReturnValue(true)
    try {
      await main(['--dry-run', '--assess-direct', '--pr', '42', '--json'])
      const result = JSON.parse(String(output.mock.calls.at(-1)?.[0]))
      expect(result.pullRequests[0]).toMatchObject({
        policyEligible: true,
        reviewStatus: 'success',
        mergeAction: { mode: 'dry-run', status: 'planned' },
        labelSync: { mode: 'dry-run', added: expect.arrayContaining(['automerge:candidate']) }
      })
      expect(runtime.inspect.mock.calls.map(([url]) => url).sort()).toEqual([
        'https://example.com',
        'https://example.com/llms.txt'
      ])
      expect(runtime.exec.mock.calls.length).toBeGreaterThan(0)
      for (const [command, args] of runtime.exec.mock.calls) {
        expect(command).toBe('gh')
        expect(args.some(arg => ['--method', '-f', '-F', '--input'].includes(arg))).toBe(false)
      }
      expect(JSON.stringify(result)).not.toContain('llms-hub-assessment')
      expect(details.body).toBe(input().body)
    } finally {
      output.mockRestore()
      vi.unstubAllEnvs()
    }
  })

  it('keeps direct assessment opt-in and preserves read-only mode', () => {
    expect(parseArgs([]).assessDirect).toBe(false)
    expect(parseArgs(['--dry-run', '--assess-direct', '--pr', '42'])).toMatchObject({
      assessDirect: true,
      dryRun: true,
      pullRequestNumber: 42
    })
  })

  it('enables direct assessment only in the trusted base workflow commands', () => {
    const workflow = readFileSync('.github/workflows/pr-automerge.yml', 'utf8')
    expect(workflow).toContain('--assess-direct --pr "$PR_NUMBER"')
    expect(workflow).toContain('--assess-direct --concurrency 4')
    expect(workflow).toContain('ref: main')
    expect(workflow).toContain('persist-credentials: false')
  })
})
