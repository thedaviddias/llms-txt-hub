import { createHash } from 'node:crypto'

import { publishSubmission } from './submission-publisher'

const SECRET = 's'.repeat(32)
const NOW = new Date('2026-08-02T12:04:00.000Z')
const HEAD = 'a'.repeat(40)
const fields = {
  category: 'developer-tools',
  description:
    'A useful developer platform with clear public documentation for teams building software.',
  llmsUrl: 'https://example.com/llms.txt',
  name: 'Example Platform',
  publishedAt: '2026-08-02',
  website: 'https://example.com/'
}
const assessment = {
  checkedAt: '2026-08-02T12:03:00.000Z',
  decision: 'auto_publish' as const,
  evidence: [
    {
      check: 'resource' as const,
      decision: 'auto_publish' as const,
      details: { checkedAt: '2026-08-02T12:03:00.000Z', providerStatus: 'safe' as const },
      reasonCode: 'passed' as const,
      resource: 'homepage' as const
    }
  ],
  policyVersion: '2026-08-01.v1',
  publicMessage: 'Passed.',
  reasonCode: 'passed' as const
}
const manualAssessment = {
  ...assessment,
  decision: 'manual_review' as const,
  publicMessage: 'A maintainer will review this submission.',
  reasonCode: 'editorial_uncertainty' as const
}

const makeGithub = () => ({
  addLabels: jest.fn().mockResolvedValue(undefined),
  createBranch: jest.fn().mockResolvedValue(undefined),
  createFile: jest.fn().mockResolvedValue(HEAD),
  createPullRequest: jest.fn().mockResolvedValue({
    body: '<!-- llms-hub-submission:sub_123 -->',
    headSha: HEAD,
    number: 42,
    url: 'https://github.com/thedaviddias/llms-txt-hub/pull/42'
  }),
  getBranchHead: jest.fn().mockResolvedValue(null),
  getDefaultBranch: jest.fn().mockResolvedValue({ branch: 'main', headSha: 'b'.repeat(40) }),
  getFile: jest.fn().mockResolvedValue(null),
  listPullRequests: jest.fn().mockResolvedValue([]),
  updatePullRequestBody: jest.fn().mockResolvedValue(undefined)
})

const makeState = () => ({
  markComplete: jest.fn().mockResolvedValue(true),
  persistBranch: jest.fn().mockResolvedValue(true),
  persistGithub: jest.fn().mockResolvedValue(true)
})

describe('publishSubmission', () => {
  it('creates a deterministic focused branch/file/PR and persists PR facts before signing', async () => {
    const github = makeGithub()
    const state = makeState()

    const result = await publishSubmission(
      { assessment, fields, mode: 'enabled', submissionId: 'sub_123' },
      { github, now: () => NOW, secret: SECRET, state }
    )

    expect(result).toEqual({
      ok: true,
      outcome: 'automatic',
      prUrl: 'https://github.com/thedaviddias/llms-txt-hub/pull/42'
    })
    expect(state.persistBranch).toHaveBeenCalledWith(
      expect.objectContaining({ branch: 'submit/sub_123' })
    )
    expect(github.createBranch).toHaveBeenCalledWith('submit/sub_123', 'b'.repeat(40))
    const file = github.createFile.mock.calls[0]?.[0]
    expect(file.path).toBe('packages/content/data/websites/example-platform-llms-txt.mdx')
    expect(file.content).toContain("name: 'Example Platform'")
    expect(file.content).toContain('\n# Example Platform\n')
    expect(file.content).not.toContain('continuation')
    expect(state.persistGithub).toHaveBeenCalledWith({
      branch: 'submit/sub_123',
      headSha: HEAD,
      prNumber: 42,
      submissionId: 'sub_123'
    })
    expect(state.persistGithub.mock.invocationCallOrder[0]).toBeLessThan(
      github.updatePullRequestBody.mock.invocationCallOrder[0] ?? 0
    )
    const signedBody = github.updatePullRequestBody.mock.calls[0]?.[1]
    expect(signedBody).toContain('<!-- llms-hub-assessment:v1')
    expect(signedBody).toContain('<!-- llms-hub-submission:sub_123 -->')
    expect(github.addLabels).not.toHaveBeenCalled()
  })

  it.each([
    ['disabled', 'disabled_auto_publish'],
    ['shadow', 'would_auto_publish']
  ] as const)('keeps auto assessment unsigned and manual in %s mode', async (mode, resultCode) => {
    const github = makeGithub()
    const state = makeState()

    await expect(
      publishSubmission(
        { assessment, fields, mode, submissionId: 'sub_123' },
        {
          github,
          now: () => NOW,
          secret: SECRET,
          state
        }
      )
    ).resolves.toMatchObject({ ok: true, outcome: 'manual' })
    expect(github.updatePullRequestBody).not.toHaveBeenCalled()
    expect(github.addLabels).toHaveBeenCalledWith(42, ['needs:manual-review'])
    expect(state.persistBranch).toHaveBeenCalledWith(expect.objectContaining({ resultCode }))
    const createdBody = github.createPullRequest.mock.calls[0]?.[0].body
    expect(createdBody).not.toContain('**Assessment:** auto_publish')
  })

  it('reconciles an existing branch, file, and PR without creating duplicates', async () => {
    const github = makeGithub()
    const state = makeState()
    github.getBranchHead.mockResolvedValue(HEAD)
    github.getFile.mockResolvedValue({ content: 'placeholder', sha: 'c'.repeat(40) })
    github.listPullRequests.mockResolvedValue([
      {
        body: '<!-- llms-hub-submission:sub_123 -->',
        headSha: HEAD,
        number: 42,
        url: 'https://github.com/thedaviddias/llms-txt-hub/pull/42'
      }
    ])

    const firstRender = await publishSubmission(
      { assessment, fields, mode: 'disabled', submissionId: 'sub_123' },
      {
        github: { ...github, getFile: jest.fn().mockResolvedValue(null) },
        now: () => NOW,
        secret: SECRET,
        state
      }
    )
    expect(firstRender.ok).toBe(true)
    const content = github.createFile.mock.calls[0]?.[0].content
    github.getFile.mockResolvedValue({ content, sha: 'c'.repeat(40) })
    github.createFile.mockClear()
    github.createPullRequest.mockClear()

    await expect(
      publishSubmission(
        { assessment, fields, mode: 'disabled', submissionId: 'sub_123' },
        {
          github,
          now: () => NOW,
          secret: SECRET,
          state
        }
      )
    ).resolves.toMatchObject({ ok: true })
    expect(github.createBranch).not.toHaveBeenCalled()
    expect(github.createFile).not.toHaveBeenCalled()
    expect(github.createPullRequest).not.toHaveBeenCalled()
  })

  it('keeps an enabled manual assessment unsigned and labeled for review', async () => {
    const github = makeGithub()
    const state = makeState()

    await expect(
      publishSubmission(
        { assessment: manualAssessment, fields, mode: 'enabled', submissionId: 'sub_123' },
        { github, now: () => NOW, secret: SECRET, state }
      )
    ).resolves.toMatchObject({ ok: true, outcome: 'manual' })
    expect(github.addLabels).toHaveBeenCalledWith(42, ['needs:manual-review'])
    expect(github.updatePullRequestBody).not.toHaveBeenCalled()
    expect(state.persistBranch).toHaveBeenCalledWith(
      expect.objectContaining({ resultCode: 'manual_review' })
    )
  })

  it('binds the signature to the exact current head and MDX bytes', async () => {
    const github = makeGithub()
    const state = makeState()
    await publishSubmission(
      { assessment, fields, mode: 'enabled', submissionId: 'sub_123' },
      { github, now: () => NOW, secret: SECRET, state }
    )

    const file = github.createFile.mock.calls[0]?.[0]
    const body = github.updatePullRequestBody.mock.calls[0]?.[1]
    const encoded = body.split('<!-- llms-hub-assessment:v1\n')[1]?.split('\n')[0]
    const payload = JSON.parse(Buffer.from(encoded, 'base64url').toString('utf8'))
    expect(payload.headSha).toBe(HEAD)
    expect(payload.mdxContentSha256).toBe(createHash('sha256').update(file.content).digest('hex'))
  })

  it('fails closed before GitHub when automatic signing is unavailable', async () => {
    const github = makeGithub()
    const state = makeState()

    await expect(
      publishSubmission(
        { assessment, fields, mode: 'enabled', submissionId: 'sub_123' },
        {
          github,
          now: () => NOW,
          secret: '',
          state
        }
      )
    ).resolves.toEqual({ code: 'publication_unavailable', ok: false })
    expect(github.getDefaultBranch).not.toHaveBeenCalled()
  })

  it('reconciles a retry after the PR exists without creating a second PR', async () => {
    const github = makeGithub()
    const state = makeState()
    state.markComplete.mockResolvedValueOnce(false).mockResolvedValueOnce(true)

    await expect(
      publishSubmission(
        { assessment, fields, mode: 'enabled', submissionId: 'sub_123' },
        { github, now: () => NOW, secret: SECRET, state }
      )
    ).resolves.toEqual({ code: 'publication_unavailable', ok: false })

    const content = github.createFile.mock.calls[0]?.[0].content
    github.getBranchHead.mockResolvedValue(HEAD)
    github.getFile.mockResolvedValue({ content, sha: 'c'.repeat(40) })
    github.listPullRequests.mockResolvedValue([
      {
        body: '<!-- llms-hub-submission:sub_123 -->',
        headSha: HEAD,
        number: 42,
        url: 'https://github.com/thedaviddias/llms-txt-hub/pull/42'
      }
    ])
    github.createBranch.mockClear()
    github.createFile.mockClear()
    github.createPullRequest.mockClear()

    await expect(
      publishSubmission(
        { assessment, fields, mode: 'enabled', submissionId: 'sub_123' },
        { github, now: () => NOW, secret: SECRET, state }
      )
    ).resolves.toMatchObject({ ok: true, outcome: 'automatic' })
    expect(github.createBranch).not.toHaveBeenCalled()
    expect(github.createFile).not.toHaveBeenCalled()
    expect(github.createPullRequest).not.toHaveBeenCalled()
  })
})
