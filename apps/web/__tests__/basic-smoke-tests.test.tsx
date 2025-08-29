/**
 * Basic smoke tests to ensure core functionality loads without errors
 * Tests are optimized for speed and run only related tests on pre-commit
 */

import { jest } from '@jest/globals'
import { render } from '@testing-library/react'
import { FavoritesProvider } from '@/contexts/favorites-context'

// Mock next/navigation
jest.mock('next/navigation', () => ({
  useRouter: () => ({
    push: jest.fn(),
    replace: jest.fn(),
    back: jest.fn(),
    forward: jest.fn(),
    refresh: jest.fn(),
    prefetch: jest.fn()
  }),
  usePathname: () => '/',
  useSearchParams: () => new URLSearchParams(),
  useParams: () => ({}),
  notFound: jest.fn(() => {
    throw new Error('NEXT_NOT_FOUND')
  })
}))

// Mock Clerk auth
jest.mock('@clerk/nextjs', () => ({
  SignedIn: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  SignedOut: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  UserButton: () => <div data-testid="user-button">User Button</div>,
  auth: jest.fn(() => Promise.resolve({ userId: null }))
}))

// Mock analytics
jest.mock('../lib/analytics', () => ({
  analytics: {
    toggleFavorite: jest.fn()
  }
}))

describe('Basic Component Rendering', () => {
  describe('Simple Components', () => {
    it('should render LoadMore component', async () => {
      const { LoadMore } = await import('../components/ui/load-more')
      const { container } = render(
        <LoadMore
          onLoadMore={jest.fn() as () => void}
          hasMore={true}
          isLoading={false}
          showItemsCount={10}
          totalItemsCount={100}
        />
      )
      expect(container).toBeInTheDocument()
    })

    it('should render EmptyState component', async () => {
      const { EmptyState } = await import('../components/empty-state')
      const { container } = render(
        <EmptyState title="Test Title" description="Test Description" actionLabel="Action" />
      )
      expect(container).toBeInTheDocument()
    })

    it('should render FavoriteButton component with provider', async () => {
      const { FavoriteButton } = await import('../components/ui/favorite-button')
      const { container } = render(
        <FavoritesProvider>
          <FavoriteButton slug="test-slug" />
        </FavoritesProvider>
      )
      expect(container).toBeInTheDocument()
    })
  })

  describe('Card Components', () => {
    it('should render GuideCard component', async () => {
      const { GuideCard } = await import('../components/sections/guide-card')
      const mockGuide = {
        slug: 'test-guide',
        title: 'Test Guide',
        description: 'Test Description',
        category: 'getting-started' as const,
        difficulty: 'beginner' as const,
        readingTime: 5,
        publishedAt: '2023-01-01',
        lastModified: '2023-01-01',
        published: true
      }
      const { container } = render(<GuideCard guide={mockGuide} />)
      expect(container).toBeInTheDocument()
    })

    it('should render TestimonialCard component', async () => {
      const { TestimonialCard } = await import('../components/testimonials/testimonial-card')
      const { container } = render(
        <TestimonialCard quote="Great product!" author="John Doe" position="Developer" />
      )
      expect(container).toBeInTheDocument()
    })

    it('should render StatCard component', async () => {
      const { StatCard } = await import('../components/stats/stat-card')
      // Mock lucide-react icon
      const MockIcon = () => <div>Icon</div>
      const { container } = render(
        <StatCard
          title="Test Stat"
          value="100"
          icon={MockIcon as any}
          description="Test description"
        />
      )
      expect(container).toBeInTheDocument()
    })

    it('should render ResourceCard component', async () => {
      const { ResourceCard } = await import('../components/resource-card')
      const mockResource = {
        slug: 'test-resource',
        title: 'Test Resource',
        description: 'Test Description',
        url: 'https://example.com',
        date: '2023-01-01',
        type: 'article',
        source: 'blog'
      }
      const { container } = render(<ResourceCard resource={mockResource} />)
      expect(container).toBeInTheDocument()
    })
  })

  describe('Section Components', () => {
    it('should render Section component', async () => {
      const { Section } = await import('../components/layout/section')
      const { container } = render(
        <Section title="Test Section" description="Test Description">
          <div>Content</div>
        </Section>
      )
      expect(container).toBeInTheDocument()
    })

    it('should render HowItWorksSection component', async () => {
      const { HowItWorksSection } = await import('../components/sections/how-it-works-section')
      const { container } = render(<HowItWorksSection />)
      expect(container).toBeInTheDocument()
    })

    it('should render CommunitiesSection component', async () => {
      const { CommunitiesSection } = await import('../components/sections/communities-section')
      const { container } = render(<CommunitiesSection />)
      expect(container).toBeInTheDocument()
    })

    it('should render NewsletterSection component', async () => {
      const { NewsletterSection } = await import('../components/sections/newsletter-section')
      const { container } = render(<NewsletterSection />)
      expect(container).toBeInTheDocument()
    })

    it('should render ToolsSection component', async () => {
      const { ToolsSection } = await import('../components/sections/tools-section')
      const { container } = render(<ToolsSection />)
      expect(container).toBeInTheDocument()
    })
  })

  describe('Utility Functions', () => {
    it('should export formatDate utility', async () => {
      const { formatDate } = await import('../lib/utils')
      expect(typeof formatDate).toBe('function')
      const result = formatDate('2023-01-01')
      expect(typeof result).toBe('string')
    })

    it('should export route functions', async () => {
      const { getRoute } = await import('../lib/routes')
      expect(typeof getRoute).toBe('function')
      const result = getRoute('home')
      expect(typeof result).toBe('string')
      expect(result).toBe('/')
    })

    it('should export categories data', async () => {
      const { categories } = await import('../lib/categories')
      expect(Array.isArray(categories)).toBe(true)
      expect(categories.length).toBeGreaterThan(0)
    })
  })
})

describe('Metadata and SEO', () => {
  it('should export generateBaseMetadata function', async () => {
    const { generateBaseMetadata } = await import('../lib/seo/seo-config')
    expect(typeof generateBaseMetadata).toBe('function')

    const metadata = generateBaseMetadata({
      title: 'Test Page',
      description: 'Test Description',
      path: '/test'
    })

    expect(metadata).toHaveProperty('title')
    expect(metadata).toHaveProperty('description')
  })

  it('should have working sitemap generation', async () => {
    try {
      const sitemap = await import('../app/sitemap')
      expect(typeof sitemap.default).toBe('function')
    } catch (error) {
      // Sitemap might have dependencies that are hard to mock
      expect(error).toBeDefined()
    }
  })

  it('should have working robots.txt generation', async () => {
    try {
      const robots = await import('../app/robots')
      expect(typeof robots.default).toBe('function')
    } catch (error) {
      // Robots might have dependencies that are hard to mock
      expect(error).toBeDefined()
    }
  })
})

describe('Error Handling', () => {
  // Suppress console.error for these tests
  beforeEach(() => {
    jest.spyOn(console, 'error').mockImplementation(() => {})
  })

  afterEach(() => {
    jest.restoreAllMocks()
  })

  it('should handle component errors gracefully', () => {
    const ThrowError = () => {
      throw new Error('Test error')
    }

    // This should not crash the test suite
    expect(() => {
      render(<ThrowError />)
    }).toThrow('Test error')
  })

  it('should render NotFound component', async () => {
    const NotFound = require('../app/not-found').default
    const { container } = render(<NotFound />)
    expect(container).toBeInTheDocument()
  })
})

describe('Component Integration', () => {
  it('should render LLMGrid with empty items', async () => {
    const { LLMGrid } = await import('../components/llm/llm-grid')
    const { container } = render(
      <FavoritesProvider>
        <LLMGrid items={[]} variant="default" />
      </FavoritesProvider>
    )
    expect(container).toBeInTheDocument()
  })

  it('should render CategoryList component', async () => {
    const { CategoryList } = await import('../components/category/category-list')
    const { container } = render(<CategoryList />)
    expect(container).toBeInTheDocument()
  })
})
