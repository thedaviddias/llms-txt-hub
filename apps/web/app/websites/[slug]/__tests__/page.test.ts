import { dynamicParams, generateStaticParams, revalidate } from '@/app/websites/[slug]/page'
import { getWebsites } from '@/lib/content-loader'

jest.mock('@/components/json-ld', () => ({
  JsonLd: () => null
}))

jest.mock('@/components/project-navigation', () => ({
  ProjectNavigation: () => null
}))

jest.mock('@/components/sections/tools-section', () => ({
  ToolsSection: () => null
}))

jest.mock('@/components/website/website-content-section', () => ({
  WebsiteContentSection: () => null
}))

jest.mock('@/components/website/website-detail-sidebar', () => ({
  WebsiteDetailSidebar: () => null
}))

jest.mock('@/components/website/website-docs-section', () => ({
  WebsiteDocsSection: () => null
}))

jest.mock('@/components/website/website-error', () => ({
  WebsiteError: () => null
}))

jest.mock('@/components/website/website-hero', () => ({
  WebsiteHero: () => null
}))

jest.mock('@/components/website/website-related-projects', () => ({
  WebsiteRelatedProjects: () => null
}))

jest.mock('@/lib/content-loader', () => ({
  getWebsiteBySlug: jest.fn(),
  getWebsites: jest.fn()
}))

jest.mock('@/lib/routes', () => ({
  getRoute: jest.fn(() => '/websites')
}))

jest.mock('@/lib/schema', () => ({
  generateWebsiteDetailSchema: jest.fn(() => ({}))
}))

jest.mock('@/lib/seo/seo-config', () => ({
  generateDynamicMetadata: jest.fn(() => ({}))
}))

const mockGetWebsites = getWebsites as jest.MockedFunction<typeof getWebsites>

describe('website detail page static generation', () => {
  it('does not prebuild website detail pages at build time', async () => {
    mockGetWebsites.mockImplementation(() => {
      throw new Error('getWebsites should not be called during static param generation')
    })

    await expect(generateStaticParams()).resolves.toEqual([])
    expect(mockGetWebsites).not.toHaveBeenCalled()
  })

  it('keeps on-demand static generation enabled for valid website slugs', () => {
    expect(dynamicParams).toBe(true)
    expect(revalidate).toBe(3600)
  })
})
