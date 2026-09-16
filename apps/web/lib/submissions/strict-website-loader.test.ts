import { websiteCollectionSource } from '@/lib/content-loader'
import { getWebsitesStrict } from './strict-website-loader'

jest.mock('@/lib/content-loader', () => ({
  websiteCollectionSource: {
    available: false,
    read: jest.fn()
  }
}))

const mockRead = jest.mocked(websiteCollectionSource.read)

describe('getWebsitesStrict', () => {
  beforeEach(() => {
    mockRead.mockReset()
  })

  it('accepts a populated readable catalogue when availability metadata is false', () => {
    const websites = [
      {
        category: 'developer-tools',
        description: 'Example website',
        llmsUrl: 'https://example.com/llms.txt',
        name: 'Example',
        publishedAt: '2026-01-01',
        slug: 'example',
        website: 'https://example.com'
      }
    ]
    mockRead.mockReturnValue(websites)

    expect(getWebsitesStrict()).toEqual({ status: 'available', websites })
  })

  it('keeps an empty unreadable catalogue unavailable', () => {
    mockRead.mockReturnValue([])

    expect(getWebsitesStrict()).toEqual({ status: 'unavailable' })
  })
})
