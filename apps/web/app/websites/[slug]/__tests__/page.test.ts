import { dynamic } from '@/app/websites/[slug]/page'

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
  getWebsiteBySlug: jest.fn()
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

describe('website detail page rendering mode', () => {
  it('renders dynamically so request-time CSP nonces are available', () => {
    expect(dynamic).toBe('force-dynamic')
  })
})
