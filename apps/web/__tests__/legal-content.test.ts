import { readFile } from 'node:fs/promises'
import { resolve } from 'node:path'

describe('canonical legal content', () => {
  it('renders the trusted-submission privacy disclosures from the canonical collection', async () => {
    const canonicalPrivacy = await readFile(
      resolve(__dirname, '../../../packages/content/data/legal/privacy.mdx'),
      'utf8'
    )
    jest.resetModules()
    jest.doMock('@/.content-collections/generated', () => ({
      allDocs: [],
      allGuides: [],
      allLegals: [{ _meta: { path: 'privacy' }, content: canonicalPrivacy }],
      allResources: [],
      allWebsites: []
    }))
    const { getLegalContent } = await import('@/lib/content-loader')
    const privacy = await getLegalContent('privacy')

    expect(privacy).toContain('Last updated: August 2, 2026')
    expect(privacy).toMatch(/X or LinkedIn/i)
    expect(privacy).toMatch(/do not (?:collect|ask for|record).*username/i)
    expect(privacy).toMatch(/do not.*API verification/i)
    expect(privacy).toMatch(/submitted and redirected URLs.*Google Web Risk/i)
    expect(privacy).toMatch(/short-lived submission state.*Upstash Redis/i)
    expect(privacy).toMatch(/abuse-control hashes.*Upstash Redis/i)
    expect(privacy).toMatch(/aggregate submission and support.*OpenPanel/i)
    expect(privacy).toMatch(/signed-in account identifier.*name.*email.*OpenPanel/i)
    expect(privacy).toMatch(/client IP.*proxy.*OpenPanel/i)
    expect(privacy).toMatch(/OpenPanel.*product analytics.*24 months/i)
    expect(privacy).toContain('https://openpanel.dev/privacy')
    expect(privacy).not.toMatch(/OpenPanel[^\n]*(?:no personal data|does not.*personal data)/i)
    expect(privacy).toMatch(/public pull request.*during review/i)
    expect(privacy).toMatch(/permanent directory retention.*after publication/i)
  })
})
