import { checkSubmissionDuplicates } from './submission-duplicates'

const INPUT = {
  llmsUrl: 'https://example.com/llms.txt#fragment',
  owner: 'thedaviddias',
  repo: 'llms-txt-hub',
  submissionId: 'sub_123',
  website: 'https://example.com/#fragment'
}

const mdx = (website = 'https://sample.org/', llmsUrl = 'https://sample.org/llms.txt') =>
  `---\nname: Other\nwebsite: ${website}\nllmsUrl: ${llmsUrl}\ncategory: developer-tools\npublishedAt: 2026-08-01\n---\nDescription.`

const makeGitHub = () => ({
  getFileContent: jest.fn(),
  listOpenPullRequests: jest.fn(),
  listPullRequestFiles: jest.fn()
})

describe('submission duplicate protection', () => {
  it.each([
    ['website', [{ website: 'https://example.com', llmsUrl: 'https://different.org/llms.txt' }]],
    ['llms URL', [{ website: 'https://different.org', llmsUrl: 'https://example.com/llms.txt' }]]
  ])('detects a normalized catalogue duplicate by %s', async (_label, catalogue) => {
    const github = makeGitHub()

    await expect(
      checkSubmissionDuplicates(INPUT, {
        getWebsites: () => catalogue,
        github
      })
    ).resolves.toEqual({ source: 'catalogue', status: 'duplicate' })
    expect(github.listOpenPullRequests).not.toHaveBeenCalled()
  })

  it('fails closed when catalogue duplicate status cannot be established', async () => {
    await expect(
      checkSubmissionDuplicates(INPUT, {
        getWebsites: () => [{ website: 'not a URL', llmsUrl: 'https://sample.org/llms.txt' }],
        github: makeGitHub()
      })
    ).resolves.toEqual({ reasonCode: 'publication_unavailable', status: 'retry_later' })
  })

  it('reconciles an open PR with the exact same submission marker', async () => {
    const github = makeGitHub()
    github.listOpenPullRequests.mockResolvedValue([
      {
        body: 'Submission\n<!-- llms-hub-submission:sub_123 -->',
        headRef: 'submit/sub_123',
        headSha: 'a'.repeat(40),
        number: 42
      }
    ])

    await expect(
      checkSubmissionDuplicates(INPUT, { getWebsites: () => [], github })
    ).resolves.toEqual({
      branch: 'submit/sub_123',
      headSha: 'a'.repeat(40),
      prNumber: 42,
      status: 'reconcile'
    })
    expect(github.listPullRequestFiles).not.toHaveBeenCalled()
  })

  it('reconciles the same ID on a full bounded PR page before returning unknown pagination', async () => {
    const github = makeGitHub()
    github.listOpenPullRequests.mockResolvedValue(
      Array.from({ length: 100 }, (_, index) => ({
        body: index === 99 ? '<!-- llms-hub-submission:sub_123 -->' : '',
        headRef: index === 99 ? 'submit/sub_123' : `contributor-${index}`,
        headSha: 'a'.repeat(40),
        number: index + 1
      }))
    )

    await expect(
      checkSubmissionDuplicates(INPUT, { getWebsites: () => [], github })
    ).resolves.toEqual({
      branch: 'submit/sub_123',
      headSha: 'a'.repeat(40),
      prNumber: 100,
      status: 'reconcile'
    })
  })

  it('does not reconcile a marker that only contains the submission ID as a substring', async () => {
    const github = makeGitHub()
    github.listOpenPullRequests.mockResolvedValue([
      {
        body: '<!-- llms-hub-submission:sub_1234 -->',
        headRef: 'submit/sub_1234',
        headSha: 'a'.repeat(40),
        number: 43
      }
    ])
    github.listPullRequestFiles.mockResolvedValue([])

    await expect(
      checkSubmissionDuplicates(INPUT, { getWebsites: () => [], github })
    ).resolves.toEqual({ status: 'unique' })
  })

  it.each([
    ['website', mdx('https://example.com', 'https://sample.org/llms.txt')],
    ['llms URL', mdx('https://sample.org', 'https://example.com/llms.txt')]
  ])('detects a normalized open-PR frontmatter duplicate by %s', async (_label, content) => {
    const github = makeGitHub()
    github.listOpenPullRequests.mockResolvedValue([
      { body: '', headRef: 'contributor', headSha: 'a'.repeat(40), number: 44 }
    ])
    github.listPullRequestFiles.mockResolvedValue([
      { path: 'packages/content/data/websites/contributor.mdx', status: 'added' }
    ])
    github.getFileContent.mockResolvedValue(content)

    await expect(
      checkSubmissionDuplicates(INPUT, { getWebsites: () => [], github })
    ).resolves.toEqual({ prNumber: 44, source: 'open_pr', status: 'duplicate' })
    expect(github.getFileContent).toHaveBeenCalledWith(
      'thedaviddias',
      'llms-txt-hub',
      'packages/content/data/websites/contributor.mdx',
      'a'.repeat(40)
    )
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
    github.listOpenPullRequests.mockResolvedValue([
      { body: '', headRef: 'contributor', headSha: 'a'.repeat(40), number: 44 }
    ])
    github.listPullRequestFiles.mockResolvedValue([
      { path: 'packages/content/data/websites/contributor.mdx', status: 'added' }
    ])
    github.getFileContent.mockResolvedValue(content)

    await expect(
      checkSubmissionDuplicates(INPUT, { getWebsites: () => [], github })
    ).resolves.toEqual({ reasonCode: 'publication_unavailable', status: 'retry_later' })
  })

  it('returns unique only after bounded catalogue and open-PR checks complete', async () => {
    const github = makeGitHub()
    github.listOpenPullRequests.mockResolvedValue([
      { body: null, headRef: 'contributor', headSha: 'a'.repeat(40), number: 44 }
    ])
    github.listPullRequestFiles.mockResolvedValue([
      { path: 'packages/content/data/websites/contributor.mdx', status: 'added' },
      { path: 'README.md', status: 'modified' }
    ])
    github.getFileContent.mockResolvedValue(mdx())

    await expect(
      checkSubmissionDuplicates(INPUT, {
        getWebsites: () => [
          { website: 'https://catalogue.org', llmsUrl: 'https://catalogue.org/llms.txt' }
        ],
        github
      })
    ).resolves.toEqual({ status: 'unique' })
  })

  it('accepts Markdown horizontal rules after valid frontmatter', async () => {
    const github = makeGitHub()
    github.listOpenPullRequests.mockResolvedValue([
      { body: '', headRef: 'contributor', headSha: 'a'.repeat(40), number: 44 }
    ])
    github.listPullRequestFiles.mockResolvedValue([
      { path: 'packages/content/data/websites/contributor.mdx', status: 'added' }
    ])
    github.getFileContent.mockResolvedValue(`${mdx()}\n\n---\n\nMore details.`)

    await expect(
      checkSubmissionDuplicates(INPUT, { getWebsites: () => [], github })
    ).resolves.toEqual({ status: 'unique' })
  })

  it.each([
    ['GitHub request failure', () => Promise.reject(new Error('sensitive upstream error'))],
    ['oversized PR body', () => Promise.resolve([{ body: 'x'.repeat(100_001), number: 44 }])],
    [
      'unbounded open PR result',
      () =>
        Promise.resolve(
          Array.from({ length: 100 }, (_, index) => ({ body: '', number: index + 1 }))
        )
    ]
  ])('fails closed on %s', async (_label, listOpenPullRequests) => {
    const github = makeGitHub()
    github.listOpenPullRequests.mockImplementation(listOpenPullRequests)

    await expect(
      checkSubmissionDuplicates(INPUT, { getWebsites: () => [], github })
    ).resolves.toEqual({ reasonCode: 'publication_unavailable', status: 'retry_later' })
  })
})
