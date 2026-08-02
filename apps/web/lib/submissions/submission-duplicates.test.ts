import { checkSubmissionDuplicates } from './submission-duplicates'

const INPUT = {
  llmsUrl: 'https://example.com/llms.txt#fragment',
  owner: 'thedaviddias',
  repo: 'llms-txt-hub',
  submissionId: 'sub_123',
  website: 'https://example.com/#fragment'
}

const mdx = (
  website = 'https://sample.org/',
  llmsUrl = 'https://sample.org/llms.txt',
  llmsFullUrl?: string
) => `---
name: Other
website: ${website}
llmsUrl: ${llmsUrl}
${llmsFullUrl ? `llmsFullUrl: ${llmsFullUrl}\n` : ''}category: developer-tools
publishedAt: 2026-08-01
---
Description.`

interface PullRequestFixture {
  baseRef: string
  baseRepoFullName: string
  body: string | null
  headOwnerLogin: string
  headRef: string
  headRepoFullName: string
  headSha: string
  number: number
}

const pullRequest = (overrides: Partial<PullRequestFixture> = {}): PullRequestFixture => ({
  baseRef: 'main',
  baseRepoFullName: 'thedaviddias/llms-txt-hub',
  body: '',
  headOwnerLogin: 'thedaviddias',
  headRef: 'contributor',
  headRepoFullName: 'thedaviddias/llms-txt-hub',
  headSha: 'a'.repeat(40),
  number: 44,
  ...overrides
})

const makeGitHub = () => ({
  getFileContent: jest.fn(),
  listOpenPullRequests: jest.fn(),
  listPullRequestFiles: jest.fn()
})

const configureOneMdx = (
  github: ReturnType<typeof makeGitHub>,
  content: string,
  pr = pullRequest()
) => {
  github.listOpenPullRequests.mockResolvedValueOnce([pr]).mockResolvedValueOnce([])
  github.listPullRequestFiles
    .mockResolvedValueOnce([
      { path: 'packages/content/data/websites/contributor.mdx', status: 'added' }
    ])
    .mockResolvedValueOnce([])
  github.getFileContent.mockResolvedValue(content)
}

describe('submission duplicate protection', () => {
  it.each([
    ['website', [{ website: 'https://example.com', llmsUrl: 'https://different.org/llms.txt' }]],
    ['llms URL', [{ website: 'https://different.org', llmsUrl: 'https://example.com/llms.txt' }]]
  ])('detects a normalized catalogue duplicate by %s', async (_label, catalogue) => {
    const github = makeGitHub()

    await expect(
      checkSubmissionDuplicates(INPUT, {
        getWebsitesStrict: () => ({ status: 'available', websites: catalogue }),
        github
      })
    ).resolves.toEqual({ source: 'catalogue', status: 'duplicate' })
    expect(github.listOpenPullRequests).not.toHaveBeenCalled()
  })

  it('fails closed when catalogue status is unavailable or malformed', async () => {
    await expect(
      checkSubmissionDuplicates(INPUT, {
        getWebsitesStrict: () => ({ status: 'unavailable' }),
        github: makeGitHub()
      })
    ).resolves.toEqual({ reasonCode: 'publication_unavailable', status: 'retry_later' })
    await expect(
      checkSubmissionDuplicates(INPUT, {
        getWebsitesStrict: () => ({
          status: 'available',
          websites: [{ website: 'not a URL', llmsUrl: 'https://sample.org/llms.txt' }]
        }),
        github: makeGitHub()
      })
    ).resolves.toEqual({ reasonCode: 'publication_unavailable', status: 'retry_later' })
  })

  it('reconciles only a trusted deterministic PR with exact normalized frontmatter', async () => {
    const github = makeGitHub()
    configureOneMdx(
      github,
      mdx('https://example.com', 'https://example.com/llms.txt'),
      pullRequest({
        body: '<!-- llms-hub-submission:sub_123 -->',
        headRef: 'submit/sub_123'
      })
    )

    await expect(
      checkSubmissionDuplicates(INPUT, {
        getWebsitesStrict: () => ({ status: 'available', websites: [] }),
        github
      })
    ).resolves.toEqual({
      branch: 'submit/sub_123',
      headSha: 'a'.repeat(40),
      prNumber: 44,
      status: 'reconcile'
    })
  })

  it.each([
    ['fork', { headOwnerLogin: 'attacker', headRepoFullName: 'attacker/fork' }],
    ['owner mismatch', { headOwnerLogin: 'attacker' }],
    ['wrong branch', { headRef: 'attacker-branch' }],
    ['substring marker', { body: '<!-- llms-hub-submission:sub_1234 -->' }],
    ['wrong base repository', { baseRepoFullName: 'attacker/fork' }],
    ['wrong base ref', { baseRef: 'release' }]
  ])('never reconciles an attacker-controlled %s candidate', async (_label, overrides) => {
    const github = makeGitHub()
    configureOneMdx(
      github,
      mdx(),
      pullRequest({ body: '<!-- llms-hub-submission:sub_123 -->', ...overrides })
    )

    await expect(
      checkSubmissionDuplicates(INPUT, {
        getWebsitesStrict: () => ({ status: 'available', websites: [] }),
        github
      })
    ).resolves.toEqual({ status: 'unique' })
  })

  it('does not reconcile a trusted marker whose exact fields differ', async () => {
    const github = makeGitHub()
    configureOneMdx(
      github,
      mdx(),
      pullRequest({ body: '<!-- llms-hub-submission:sub_123 -->', headRef: 'submit/sub_123' })
    )

    await expect(
      checkSubmissionDuplicates(INPUT, {
        getWebsitesStrict: () => ({ status: 'available', websites: [] }),
        github
      })
    ).resolves.toEqual({ reasonCode: 'publication_unavailable', status: 'retry_later' })
  })

  it('requires optional llms-full frontmatter to match before reconciliation', async () => {
    const github = makeGitHub()
    configureOneMdx(
      github,
      mdx('https://example.com', 'https://example.com/llms.txt'),
      pullRequest({ body: '<!-- llms-hub-submission:sub_123 -->', headRef: 'submit/sub_123' })
    )

    await expect(
      checkSubmissionDuplicates(
        { ...INPUT, llmsFullUrl: 'https://example.com/llms-full.txt' },
        {
          getWebsitesStrict: () => ({ status: 'available', websites: [] }),
          github
        }
      )
    ).resolves.toEqual({ prNumber: 44, source: 'open_pr', status: 'duplicate' })
  })

  it('returns unknown for multiple exact marker candidates', async () => {
    const github = makeGitHub()
    github.listOpenPullRequests
      .mockResolvedValueOnce(
        Array.from({ length: 50 }, (_, index) =>
          pullRequest({
            body: index === 0 ? '<!-- llms-hub-submission:sub_123 -->' : '',
            headRef: index === 0 ? 'submit/sub_123' : `contributor-${index}`,
            number: index + 1
          })
        )
      )
      .mockResolvedValueOnce([
        pullRequest({
          body: '<!-- llms-hub-submission:sub_123 -->',
          headRef: 'submit/sub_123',
          number: 51
        })
      ])

    await expect(
      checkSubmissionDuplicates(INPUT, {
        getWebsitesStrict: () => ({ status: 'available', websites: [] }),
        github
      })
    ).resolves.toEqual({ reasonCode: 'publication_unavailable', status: 'retry_later' })
  })

  it('returns unknown when bounded PR pagination remains truncated', async () => {
    const github = makeGitHub()
    github.listOpenPullRequests.mockImplementation(async (_owner, _repo, page) =>
      Array.from({ length: 50 }, (_, index) =>
        pullRequest({ headRef: `page-${page}-${index}`, number: page * 100 + index })
      )
    )

    await expect(
      checkSubmissionDuplicates(INPUT, {
        getWebsitesStrict: () => ({ status: 'available', websites: [] }),
        github
      })
    ).resolves.toEqual({ reasonCode: 'publication_unavailable', status: 'retry_later' })
    expect(github.listOpenPullRequests).toHaveBeenCalledTimes(3)
  })

  it('finds one exact marker on a later complete page before reconciliation', async () => {
    const github = makeGitHub()
    github.listOpenPullRequests
      .mockResolvedValueOnce(
        Array.from({ length: 50 }, (_, index) =>
          pullRequest({ headRef: `contributor-${index}`, number: index + 1 })
        )
      )
      .mockResolvedValueOnce([
        pullRequest({
          body: '<!-- llms-hub-submission:sub_123 -->',
          headRef: 'submit/sub_123',
          number: 51
        })
      ])
    github.listPullRequestFiles.mockImplementation(async (_owner, _repo, pullNumber, page) => {
      if (pullNumber === 51 && page === 1) {
        return [{ path: 'packages/content/data/websites/candidate.mdx', status: 'added' }]
      }
      return []
    })
    github.getFileContent.mockResolvedValue(
      mdx('https://example.com', 'https://example.com/llms.txt')
    )

    await expect(
      checkSubmissionDuplicates(INPUT, {
        getWebsitesStrict: () => ({ status: 'available', websites: [] }),
        github
      })
    ).resolves.toMatchObject({ prNumber: 51, status: 'reconcile' })
  })

  it.each([
    ['website', mdx('https://example.com', 'https://sample.org/llms.txt')],
    ['llms URL', mdx('https://sample.org', 'https://example.com/llms.txt')]
  ])('detects a normalized open-PR frontmatter duplicate by %s', async (_label, content) => {
    const github = makeGitHub()
    configureOneMdx(github, content)

    await expect(
      checkSubmissionDuplicates(INPUT, {
        getWebsitesStrict: () => ({ status: 'available', websites: [] }),
        github
      })
    ).resolves.toEqual({ prNumber: 44, source: 'open_pr', status: 'duplicate' })
  })

  it.each([
    ['missing delimiters', 'website: https://example.com\nllmsUrl: https://example.com/llms.txt'],
    ['malformed YAML', '---\nwebsite: [\nllmsUrl: https://example.com/llms.txt\n---'],
    ['missing required field', '---\nwebsite: https://example.com\n---'],
    [
      'duplicate key',
      '---\nwebsite: https://sample.org\nwebsite: https://example.com\nllmsUrl: https://sample.org/llms.txt\n---\nDescription.'
    ]
  ])('fails closed for %s in a website MDX added by an open PR', async (_label, content) => {
    const github = makeGitHub()
    configureOneMdx(github, content)

    await expect(
      checkSubmissionDuplicates(INPUT, {
        getWebsitesStrict: () => ({ status: 'available', websites: [] }),
        github
      })
    ).resolves.toEqual({ reasonCode: 'publication_unavailable', status: 'retry_later' })
  })

  it('accepts Markdown horizontal rules after valid frontmatter', async () => {
    const github = makeGitHub()
    configureOneMdx(github, `${mdx()}\n\n---\n\nMore details.`)

    await expect(
      checkSubmissionDuplicates(INPUT, {
        getWebsitesStrict: () => ({ status: 'available', websites: [] }),
        github
      })
    ).resolves.toEqual({ status: 'unique' })
  })

  it('fails closed when the global GitHub request budget is exhausted', async () => {
    const github = makeGitHub()
    github.listOpenPullRequests.mockResolvedValue(
      Array.from({ length: 10 }, (_, index) => pullRequest({ number: index + 1 }))
    )
    github.listPullRequestFiles.mockResolvedValue([])

    await expect(
      checkSubmissionDuplicates(INPUT, {
        getWebsitesStrict: () => ({ status: 'available', websites: [] }),
        github,
        requestBudget: 4
      })
    ).resolves.toEqual({ reasonCode: 'publication_unavailable', status: 'retry_later' })
    expect(github.listPullRequestFiles.mock.calls.length).toBeLessThanOrEqual(3)
  })

  it('aborts a stalled GitHub operation at the total inspection deadline', async () => {
    const github = makeGitHub()
    github.listOpenPullRequests.mockImplementation(
      async (_owner, _repo, _page, signal: AbortSignal) =>
        new Promise((_resolve, reject) => {
          signal.addEventListener('abort', () => reject(new Error('aborted')), { once: true })
        })
    )

    const startedAt = Date.now()
    await expect(
      checkSubmissionDuplicates(INPUT, {
        deadlineMs: 20,
        getWebsitesStrict: () => ({ status: 'available', websites: [] }),
        github
      })
    ).resolves.toEqual({ reasonCode: 'publication_unavailable', status: 'retry_later' })
    expect(Date.now() - startedAt).toBeLessThan(500)
  })

  it.each([
    ['GitHub request failure', () => Promise.reject(new Error('sensitive upstream error'))],
    ['oversized PR body', () => Promise.resolve([pullRequest({ body: 'x'.repeat(100_001) })])],
    [
      'oversized raw page',
      () =>
        Promise.resolve(Array.from({ length: 51 }, (_, index) => pullRequest({ number: index })))
    ]
  ])('fails closed on %s', async (_label, listOpenPullRequests) => {
    const github = makeGitHub()
    github.listOpenPullRequests.mockImplementation(listOpenPullRequests)

    await expect(
      checkSubmissionDuplicates(INPUT, {
        getWebsitesStrict: () => ({ status: 'available', websites: [] }),
        github
      })
    ).resolves.toEqual({ reasonCode: 'publication_unavailable', status: 'retry_later' })
  })
})
