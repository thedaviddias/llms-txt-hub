describe('default catalogue availability boundary', () => {
  afterEach(() => {
    jest.resetModules()
    jest.dontMock('@/.content-collections/generated')
    jest.dontMock('@octokit/rest')
    jest.dontMock('./strict-website-loader')
  })

  it('fails duplicate checking closed when the generated catalogue cannot load', async () => {
    jest.doMock('@/.content-collections/generated', () => {
      throw new Error('generated catalogue unavailable')
    })

    await jest.isolateModulesAsync(async () => {
      const { checkSubmissionDuplicates } = await import('./submission-duplicates')

      await expect(
        checkSubmissionDuplicates({
          llmsUrl: 'https://example.com/llms.txt',
          owner: 'thedaviddias',
          repo: 'llms-txt-hub',
          submissionId: 'sub_123',
          website: 'https://example.com/'
        })
      ).resolves.toEqual({ reasonCode: 'publication_unavailable', status: 'retry_later' })
    })
  })

  it('distinguishes a legitimately loaded empty catalogue from unavailability', async () => {
    jest.doMock('@/.content-collections/generated', () => ({
      allDocs: [],
      allGuides: [],
      allLegals: [],
      allResources: [],
      allWebsites: []
    }))

    await jest.isolateModulesAsync(async () => {
      const { getWebsitesStrict } = await import('./strict-website-loader')

      expect(getWebsitesStrict()).toEqual({ status: 'available', websites: [] })
    })
  })

  it('reports malformed generated catalogue entries as unavailable', async () => {
    jest.doMock('@/.content-collections/generated', () => ({
      allDocs: [],
      allGuides: [],
      allLegals: [],
      allResources: [],
      allWebsites: [{ name: 'Missing URL fields' }]
    }))

    await jest.isolateModulesAsync(async () => {
      const { getWebsitesStrict } = await import('./strict-website-loader')

      expect(getWebsitesStrict()).toEqual({ status: 'unavailable' })
    })
  })

  it('rejects an oversized raw GitHub page before mapping response items', async () => {
    const list = jest.fn().mockResolvedValue({ data: Array.from({ length: 51 }, () => ({})) })
    jest.doMock('./strict-website-loader', () => ({
      getWebsitesStrict: () => ({ status: 'available', websites: [] })
    }))
    jest.doMock('@octokit/rest', () => ({
      Octokit: jest.fn().mockImplementation(() => ({ pulls: { list } }))
    }))

    await jest.isolateModulesAsync(async () => {
      const { checkSubmissionDuplicates } = await import('./submission-duplicates')

      await expect(
        checkSubmissionDuplicates({
          llmsUrl: 'https://example.com/llms.txt',
          owner: 'thedaviddias',
          repo: 'llms-txt-hub',
          submissionId: 'sub_123',
          website: 'https://example.com/'
        })
      ).resolves.toEqual({ reasonCode: 'publication_unavailable', status: 'retry_later' })
    })
  })

  it('rejects oversized raw base64 before whitespace replacement or decoding', async () => {
    const list = jest.fn().mockResolvedValue({
      data: [
        {
          body: '',
          head: {
            ref: 'contributor',
            repo: {
              full_name: 'thedaviddias/llms-txt-hub',
              owner: { login: 'thedaviddias' }
            },
            sha: 'a'.repeat(40)
          },
          number: 44
        }
      ]
    })
    const listFiles = jest.fn().mockResolvedValue({
      data: [{ filename: 'packages/content/data/websites/contributor.mdx', status: 'added' }]
    })
    const getContent = jest.fn().mockResolvedValue({
      data: { content: ' '.repeat(150_001), encoding: 'base64', type: 'file' }
    })
    jest.doMock('./strict-website-loader', () => ({
      getWebsitesStrict: () => ({ status: 'available', websites: [] })
    }))
    jest.doMock('@octokit/rest', () => ({
      Octokit: jest.fn().mockImplementation(() => ({
        pulls: { list, listFiles },
        repos: { getContent }
      }))
    }))

    await jest.isolateModulesAsync(async () => {
      const { checkSubmissionDuplicates } = await import('./submission-duplicates')

      await expect(
        checkSubmissionDuplicates({
          llmsUrl: 'https://example.com/llms.txt',
          owner: 'thedaviddias',
          repo: 'llms-txt-hub',
          submissionId: 'sub_123',
          website: 'https://example.com/'
        })
      ).resolves.toEqual({ reasonCode: 'publication_unavailable', status: 'retry_later' })
      expect(getContent).toHaveBeenCalledTimes(1)
    })
  })
})
