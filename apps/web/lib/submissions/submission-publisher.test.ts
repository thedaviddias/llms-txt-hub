import { spawnSync } from 'node:child_process'
import { createHash } from 'node:crypto'

import { logger } from '@thedaviddias/logging'
import matter from 'gray-matter'

import { publishSubmission } from './submission-publisher'

jest.mock('@thedaviddias/logging', () => ({
  logger: { error: jest.fn(), info: jest.fn(), warn: jest.fn() }
}))

const mockLoggerInfo = jest.mocked(logger.info)

const parseAndRenderMdx = (
  source: string
): { readonly ast: string; readonly renderedText: readonly string[] } => {
  const result = spawnSync(
    process.execPath,
    [
      '--input-type=module',
      '-e',
      "import { evaluate } from '@mdx-js/mdx'; import { JSDOM } from 'jsdom'; import React from 'react'; import { renderToStaticMarkup } from 'react-dom/server'; import * as runtime from 'react/jsx-runtime'; import remarkMdx from 'remark-mdx'; import remarkParse from 'remark-parse'; import { unified } from 'unified'; const source = process.env.SUBMISSION_MARKDOWN ?? ''; const ast = unified().use(remarkParse).use(remarkMdx).parse(source); const module = await evaluate(source, { ...runtime }); const html = renderToStaticMarkup(React.createElement(module.default)); const document = new JSDOM(html).window.document; process.stdout.write(JSON.stringify({ ast, renderedText: [...document.body.children].map(node => node.textContent) }))"
    ],
    { encoding: 'utf8', env: { ...process.env, SUBMISSION_MARKDOWN: source } }
  )
  expect(result.status).toBe(0)
  expect(result.stderr).toBe('')
  return JSON.parse(result.stdout)
}

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
  beginAttempt: jest.fn().mockResolvedValue(true),
  markFailed: jest.fn().mockResolvedValue(true),
  persistBranch: jest.fn().mockResolvedValue(true),
  persistGithub: jest.fn().mockResolvedValue(true)
})

describe('publishSubmission', () => {
  beforeEach(() => mockLoggerInfo.mockClear())

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
      publicationAttempted: true,
      prCreated: true,
      prPresent: true,
      prUrl: 'https://github.com/thedaviddias/llms-txt-hub/pull/42'
    })
    expect(state.persistBranch).toHaveBeenCalledWith(
      expect.objectContaining({ branch: 'submit/sub_123' })
    )
    expect(state.beginAttempt.mock.invocationCallOrder[0]).toBeLessThan(
      state.persistBranch.mock.invocationCallOrder[0] ?? 0
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
    expect(state.markFailed).not.toHaveBeenCalled()
    expect(mockLoggerInfo).toHaveBeenLastCalledWith(
      'Submission publication completed',
      expect.objectContaining({
        data: expect.objectContaining({ outcome: 'automatic', reasonCode: 'auto_publish' })
      })
    )
    expect(JSON.stringify(mockLoggerInfo.mock.calls)).not.toContain('example.com')
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
    ).resolves.toMatchObject({ ok: true, prCreated: false, prPresent: true })
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

  it('round-trips raw frontmatter while serializing active body syntax as literal AST text', async () => {
    const github = makeGithub()
    const state = makeState()
    const unsafeFields = {
      ...fields,
      description:
        'Acme (v2.0). ![tracker](https://evil.example/pixel)\n> quote\n- list\n| a | b |\n===\n<script src="https://evil.example/x.js"></script> {alert(1)} **bold** ```js &lt; &amp; &#123; \\path',
      name: 'Acme.Tools (R&D) [Deceptive](https://evil.example) <Widget value={alert(1)} /> `code`'
    }

    await expect(
      publishSubmission(
        { assessment, fields: unsafeFields, mode: 'disabled', submissionId: 'sub_123' },
        { github, now: () => NOW, secret: SECRET, state }
      )
    ).resolves.toMatchObject({ ok: true })

    const content = github.createFile.mock.calls[0]?.[0].content
    const parsed = matter(content)
    expect(parsed.data.name).toBe(unsafeFields.name)
    expect(parsed.data.description).toBe(unsafeFields.description)

    const parsedMdx = parseAndRenderMdx(parsed.content)
    const ast = JSON.stringify(parsedMdx.ast)
    expect(ast).not.toMatch(/"type":"(?:link|image|html|code|blockquote|list|table|mdx[^"]*)"/)
    expect(ast).toContain('Acme.Tools (R&D)')
    expect(ast).toContain('Deceptive')
    expect(ast).toContain('tracker')
    expect(ast).toContain('Widget')
    expect(parsedMdx.renderedText).toEqual([unsafeFields.name, unsafeFields.description])
    expect(parsed.content).not.toMatch(/(?<!\\)!\[/)
    expect(parsed.content).not.toMatch(/(?<!\\)\[Deceptive\]\(/)
    expect(parsed.content).not.toMatch(/(?<!\\)<(?:Widget|script)\b/)
    expect(parsed.content).not.toMatch(/(?<!\\)\{alert\(/)
    expect(parsed.content).not.toMatch(/\n(?:>|-|\|)/)
    expect(parsed.content).not.toContain('\n===')
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
    ).resolves.toEqual({
      code: 'publication_unavailable',
      ok: false,
      publicationAttempted: false,
      prCreated: false,
      prPresent: false,
      recovery: 'fresh_preflight'
    })
    expect(github.getDefaultBranch).not.toHaveBeenCalled()
  })

  it('treats a branch-state response as uncertain and marks the bound attempt failed', async () => {
    const github = makeGithub()
    const state = makeState()
    state.persistBranch.mockResolvedValue(false)

    await expect(
      publishSubmission(
        { assessment, fields, mode: 'enabled', submissionId: 'sub_123' },
        { github, now: () => NOW, secret: SECRET, state }
      )
    ).resolves.toMatchObject({ ok: false, recovery: 'same_submission' })
    expect(state.markFailed).toHaveBeenCalledWith({
      branch: 'submit/sub_123',
      outcome: 'automatic',
      resultCode: 'auto_publish',
      submissionId: 'sub_123'
    })
    expect(github.getDefaultBranch).not.toHaveBeenCalled()
  })

  it('reconciles a retry after the PR exists without creating a second PR', async () => {
    const github = makeGithub()
    const state = makeState()
    github.updatePullRequestBody.mockRejectedValueOnce(new Error('provider unavailable'))

    await expect(
      publishSubmission(
        { assessment, fields, mode: 'enabled', submissionId: 'sub_123' },
        { github, now: () => NOW, secret: SECRET, state }
      )
    ).resolves.toEqual({
      code: 'publication_unavailable',
      ok: false,
      publicationAttempted: true,
      prCreated: true,
      prPresent: true,
      recovery: 'same_submission'
    })
    expect(state.markFailed).toHaveBeenCalledWith({
      branch: 'submit/sub_123',
      outcome: 'automatic',
      resultCode: 'auto_publish',
      submissionId: 'sub_123'
    })
    expect(mockLoggerInfo).toHaveBeenLastCalledWith(
      'Submission publication completed',
      expect.objectContaining({
        data: expect.objectContaining({
          outcome: 'retry_later',
          reasonCode: 'publication_unavailable'
        })
      })
    )

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
    state.markFailed.mockClear()

    await expect(
      publishSubmission(
        { assessment, fields, mode: 'enabled', submissionId: 'sub_123' },
        { github, now: () => NOW, secret: SECRET, state }
      )
    ).resolves.toMatchObject({
      ok: true,
      outcome: 'automatic',
      prCreated: false,
      prPresent: true
    })
    expect(github.createBranch).not.toHaveBeenCalled()
    expect(github.createFile).not.toHaveBeenCalled()
    expect(github.createPullRequest).not.toHaveBeenCalled()
    expect(state.markFailed).not.toHaveBeenCalled()
  })

  it('reports a confirmed new PR when persisting its GitHub facts fails', async () => {
    const github = makeGithub()
    const state = makeState()
    state.persistGithub.mockResolvedValue(false)

    await expect(
      publishSubmission(
        { assessment, fields, mode: 'enabled', submissionId: 'sub_123' },
        { github, now: () => NOW, secret: SECRET, state }
      )
    ).resolves.toMatchObject({
      ok: false,
      publicationAttempted: true,
      prCreated: true,
      prPresent: true,
      recovery: 'same_submission'
    })
    expect(github.createPullRequest).toHaveBeenCalledTimes(1)
    expect(state.markFailed).toHaveBeenCalledTimes(1)
  })

  it('does not claim an invalid created PR response is present', async () => {
    const github = makeGithub()
    const state = makeState()
    github.createPullRequest.mockResolvedValue({
      body: 'missing submission marker',
      headSha: HEAD,
      number: 42,
      url: 'https://github.com/thedaviddias/llms-txt-hub/pull/42'
    })

    await expect(
      publishSubmission(
        { assessment, fields, mode: 'enabled', submissionId: 'sub_123' },
        { github, now: () => NOW, secret: SECRET, state }
      )
    ).resolves.toMatchObject({
      ok: false,
      prCreated: false,
      prPresent: false,
      recovery: 'same_submission'
    })
  })

  it('preserves a validated existing PR when later state persistence fails', async () => {
    const github = makeGithub()
    const state = makeState()
    await publishSubmission(
      { assessment, fields, mode: 'enabled', submissionId: 'sub_123' },
      { github, now: () => NOW, secret: SECRET, state }
    )
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
    github.createPullRequest.mockClear()
    state.persistGithub.mockResolvedValue(false)

    await expect(
      publishSubmission(
        { assessment, fields, mode: 'enabled', submissionId: 'sub_123' },
        { github, now: () => NOW, secret: SECRET, state }
      )
    ).resolves.toMatchObject({
      ok: false,
      prCreated: false,
      prPresent: true,
      recovery: 'same_submission'
    })
    expect(github.createPullRequest).not.toHaveBeenCalled()
  })

  it('reconciles concurrent recovery against the same existing PR idempotently', async () => {
    const github = makeGithub()
    const state = makeState()

    await publishSubmission(
      { assessment, fields, mode: 'enabled', submissionId: 'sub_123' },
      { github, now: () => NOW, secret: SECRET, state }
    )
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

    const results = await Promise.all([
      publishSubmission(
        { assessment, fields, mode: 'enabled', submissionId: 'sub_123' },
        { github, now: () => NOW, secret: SECRET, state }
      ),
      publishSubmission(
        { assessment, fields, mode: 'enabled', submissionId: 'sub_123' },
        { github, now: () => NOW, secret: SECRET, state }
      )
    ])

    expect(results).toEqual([
      {
        ok: true,
        outcome: 'automatic',
        publicationAttempted: true,
        prCreated: false,
        prPresent: true,
        prUrl: 'https://github.com/thedaviddias/llms-txt-hub/pull/42'
      },
      {
        ok: true,
        outcome: 'automatic',
        publicationAttempted: true,
        prCreated: false,
        prPresent: true,
        prUrl: 'https://github.com/thedaviddias/llms-txt-hub/pull/42'
      }
    ])
    expect(github.createBranch).not.toHaveBeenCalled()
    expect(github.createFile).not.toHaveBeenCalled()
    expect(github.createPullRequest).not.toHaveBeenCalled()
  })
})
