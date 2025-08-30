import { GET } from '@/app/api/websites/route'
import { getWebsites } from '@/lib/content-loader'
import { logger } from '@thedaviddias/logging'

// Mock dependencies
jest.mock('@/lib/content-loader')
jest.mock('@thedaviddias/logging')

const mockGetWebsites = getWebsites as jest.MockedFunction<typeof getWebsites>
const mockLogger = logger as jest.Mocked<typeof logger>

describe('/api/websites', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  describe('GET /api/websites', () => {
    it('should return websites successfully', async () => {
      const mockWebsites = [
        {
          name: 'Example Website',
          description: 'A test website',
          website: 'https://example.com',
          category: 'Tools',
          slug: 'example-website',
          llmsUrl: 'https://example.com/llms.txt',
          llmsFullUrl: 'https://example.com/llms-full.txt',
          publishedAt: '2024-01-01'
        },
        {
          name: 'Another Site',
          description: 'Another test site',
          website: 'https://another.com',
          category: 'Education',
          slug: 'another-site',
          llmsUrl: 'https://another.com/llms.txt',
          publishedAt: '2024-01-02'
        }
      ]

      mockGetWebsites.mockReturnValue(mockWebsites)

      const response = await GET()
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data).toEqual(mockWebsites)
      expect(mockGetWebsites).toHaveBeenCalledTimes(1)
    })

    it('should return empty array when no websites found', async () => {
      mockGetWebsites.mockReturnValue([])

      const response = await GET()
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data).toEqual([])
      expect(mockGetWebsites).toHaveBeenCalledTimes(1)
    })

    it('should handle content loader errors gracefully', async () => {
      const contentError = new Error('Failed to load content')
      mockGetWebsites.mockImplementation(() => {
        throw contentError
      })

      const response = await GET()
      const data = await response.json()

      expect(response.status).toBe(500)
      expect(data).toEqual({ error: 'Failed to fetch websites' })
      expect(mockLogger.error).toHaveBeenCalledWith('Error fetching websites', {
        data: contentError,
        tags: { api: 'websites' }
      })
    })

    it('should handle file system errors', async () => {
      const fsError = new Error('ENOENT: no such file or directory') as Error & { code?: string }
      fsError.code = 'ENOENT'
      mockGetWebsites.mockImplementation(() => {
        throw fsError
      })

      const response = await GET()
      const data = await response.json()

      expect(response.status).toBe(500)
      expect(data).toEqual({ error: 'Failed to fetch websites' })
      expect(mockLogger.error).toHaveBeenCalledWith('Error fetching websites', {
        data: fsError,
        tags: { api: 'websites' }
      })
    })

    it('should handle malformed content gracefully', async () => {
      const malformedError = new Error('Invalid frontmatter syntax')
      mockGetWebsites.mockImplementation(() => {
        throw malformedError
      })

      const response = await GET()
      const data = await response.json()

      expect(response.status).toBe(500)
      expect(data).toEqual({ error: 'Failed to fetch websites' })
      expect(mockLogger.error).toHaveBeenCalledWith('Error fetching websites', {
        data: malformedError,
        tags: { api: 'websites' }
      })
    })

    it('should return proper JSON content type', async () => {
      mockGetWebsites.mockReturnValue([])

      const response = await GET()

      expect(response.headers.get('content-type')).toContain('application/json')
    })

    it('should handle large dataset efficiently', async () => {
      // Create a large mock dataset
      const largeDataset = Array.from({ length: 1000 }, (_, index) => ({
        name: `Website ${index}`,
        description: `Description for website ${index}`,
        website: `https://example${index}.com`,
        category: 'Tools',
        slug: `website-${index}`,
        llmsUrl: `https://example${index}.com/llms.txt`,
        publishedAt: '2024-01-01'
      }))

      mockGetWebsites.mockReturnValue(largeDataset)

      const startTime = Date.now()
      const response = await GET()
      const endTime = Date.now()
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data).toHaveLength(1000)
      expect(endTime - startTime).toBeLessThan(1000) // Should respond within 1 second
    })

    it('should validate website data structure', async () => {
      const mockWebsites = [
        {
          name: 'Complete Website',
          description: 'Complete description',
          website: 'https://complete.com',
          category: 'Tools',
          slug: 'complete-website',
          llmsUrl: 'https://complete.com/llms.txt',
          llmsFullUrl: 'https://complete.com/llms-full.txt',
          publishedAt: '2024-01-01'
        }
      ]

      mockGetWebsites.mockReturnValue(mockWebsites)

      const response = await GET()
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(Array.isArray(data)).toBe(true)

      const website = data[0]
      expect(website).toHaveProperty('name')
      expect(website).toHaveProperty('description')
      expect(website).toHaveProperty('website')
      expect(website).toHaveProperty('category')
      expect(website).toHaveProperty('slug')
      expect(website.website).toMatch(/^https?:\/\//)
    })
  })
})
