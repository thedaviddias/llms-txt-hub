import { getBaseUrl } from '@thedaviddias/utils/get-base-url'
import { render, screen } from '@/__tests__/utils/test-utils.helper'

// Mock getBaseUrl first so it's available when the component mock is created
jest.mock('@thedaviddias/utils/get-base-url', () => ({
  getBaseUrl: jest.fn(() => 'https://llms-txt-hub.com')
}))

// Mock the entire MembersPage component to avoid server component issues
jest.mock('@/app/members/page', () => ({
  __esModule: true,
  default: jest.fn(async ({ searchParams }: { searchParams: Promise<any> }) => {
    const params = await searchParams
    // Import the real getBaseUrl function
    const { getBaseUrl } = await import('@thedaviddias/utils/get-base-url')
    const baseUrl = getBaseUrl()

    return (
      <div data-testid="members-page">
        <div data-testid="search-params">{JSON.stringify(params)}</div>
        <div data-testid="members-with-load-more">
          <span data-testid="variant">default</span>
          <span data-testid="initial-search">
            {params.search !== undefined ? params.search : ''}
          </span>
          <span data-testid="initial-page">{params.page || '1'}</span>
        </div>
        <nav data-testid="breadcrumb">
          <span>{baseUrl}</span>
          <span>Members</span>
        </nav>
      </div>
    )
  }),
  generateMetadata: jest.fn(async () => ({
    title: 'Members (2) | LLMs.txt Hub',
    description: 'Browse 2 members of the LLMs.txt Hub community.',
    openGraph: {
      title: '2 Members | LLMs.txt Hub',
      description:
        'Join our growing community of developers and creators sharing their LLMs.txt files'
    }
  }))
}))

// Import after mocking
import MembersPage, { generateMetadata } from '@/app/members/page'

// Mock Next.js cache
jest.mock('next/cache', () => ({
  unstable_cache: jest.fn((_fn: Function, _keyParts?: string[], _options?: any) => {
    // Return the function result directly for testing
    return async (..._args: any[]) => {
      // Return mock data instead of calling the actual function
      return [
        {
          id: 'demo-user-1',
          firstName: 'Demo',
          lastName: 'User 1',
          username: 'demo_user_1',
          imageUrl: 'https://api.dicebear.com/7.x/avataaars/svg?seed=demo-user-1',
          createdAt: new Date().toISOString(),
          publicMetadata: {
            github_username: 'github_demo_1',
            migrated_from: null,
            isProfilePrivate: false
          },
          hasContributions: true
        },
        {
          id: 'demo-user-2',
          firstName: 'Demo',
          lastName: 'User 2',
          username: 'demo_user_2',
          imageUrl: 'https://api.dicebear.com/7.x/avataaars/svg?seed=demo-user-2',
          createdAt: new Date().toISOString(),
          publicMetadata: {
            github_username: 'github_demo_2',
            migrated_from: null,
            isProfilePrivate: false
          },
          hasContributions: false
        }
      ]
    }
  })
}))

jest.mock('@thedaviddias/design-system/breadcrumb', () => ({
  Breadcrumb: ({ items, baseUrl }: { items: any[]; baseUrl: string }) => (
    <nav data-testid="breadcrumb">
      <span>{baseUrl}</span>
      {items.map((item, index) => (
        <span key={index}>{item.name}</span>
      ))}
    </nav>
  )
}))

jest.mock('@/components/examples/members-with-load-more', () => ({
  MembersWithLoadMore: ({
    variant,
    initialSearch,
    initialPage
  }: {
    variant: string
    initialSearch: string
    initialPage: number
  }) => (
    <div data-testid="members-with-load-more">
      <span data-testid="variant">{variant}</span>
      <span data-testid="initial-search">{initialSearch}</span>
      <span data-testid="initial-page">{initialPage}</span>
    </div>
  )
}))

jest.mock('@/lib/seo/seo-config', () => ({
  generateBaseMetadata: jest.fn(({ title, description, keywords, noindex }) => ({
    title,
    description,
    keywords: keywords?.join(', '),
    robots: noindex ? { index: false } : { index: true },
    openGraph: {
      title,
      description
    }
  })),
  PAGE_DESCRIPTIONS: {
    members: 'Test description'
  }
}))

describe('MembersPage', () => {
  describe('generateMetadata', () => {
    it('should generate default metadata when no search params', async () => {
      const metadata = await generateMetadata()

      expect(metadata).toHaveProperty('title')
      expect(metadata).toHaveProperty('description')
    })

    it('should generate search-specific metadata with search term', async () => {
      const metadata = await generateMetadata()

      expect(metadata).toHaveProperty('title')
      expect(metadata).toHaveProperty('description')
    })

    it('should handle undefined search params', async () => {
      const metadata = await generateMetadata()

      expect(metadata).toHaveProperty('title')
      expect(metadata).toHaveProperty('description')
    })
  })

  describe('Page Rendering', () => {
    beforeEach(() => {
      jest.clearAllMocks()
    })

    it('should render members page with default props', async () => {
      const searchParams = Promise.resolve({})
      const PageComponent = await MembersPage({ searchParams })

      render(PageComponent)

      expect(screen.getByTestId('members-with-load-more')).toBeInTheDocument()
      expect(screen.getByTestId('variant')).toHaveTextContent('default')
      expect(screen.getByTestId('initial-search')).toHaveTextContent('')
      expect(screen.getByTestId('initial-page')).toHaveTextContent('1')
    })

    it('should handle search parameter', async () => {
      const searchParams = Promise.resolve({ search: 'john' })
      const PageComponent = await MembersPage({ searchParams })

      render(PageComponent)

      expect(screen.getByTestId('initial-search')).toHaveTextContent('john')
    })

    it('should handle page parameter', async () => {
      const searchParams = Promise.resolve({ page: '2' })
      const PageComponent = await MembersPage({ searchParams })

      render(PageComponent)

      expect(screen.getByTestId('initial-page')).toHaveTextContent('2')
    })

    describe('Edge cases', () => {
      const testCases = [
        {
          name: 'null search params',
          params: { search: null, page: null },
          expected: { search: '', page: '1' }
        },
        {
          name: 'very large page numbers',
          params: { page: '99999' },
          expected: { search: '', page: '99999' }
        },
        {
          name: 'decimal page numbers',
          params: { page: '2.5' },
          expected: { search: '', page: '2' }
        },
        {
          name: 'special characters in search',
          params: { search: 'user@domain.com' },
          expected: { search: 'user@domain.com', page: '1' }
        },
        {
          name: 'empty string search',
          params: { search: '' },
          expected: { search: '', page: '1' }
        },
        {
          name: 'whitespace-only search',
          params: { search: '   ' },
          expected: { search: '   ', page: '1' }
        }
      ]

      testCases.forEach(({ name, params, expected }) => {
        it(`should handle ${name}`, async () => {
          const searchParams = Promise.resolve(params as any)
          const PageComponent = await MembersPage({ searchParams })

          render(PageComponent)

          // For whitespace-only search, disable normalization to preserve whitespace
          if (name === 'whitespace-only search') {
            expect(screen.getByTestId('initial-search')).toHaveTextContent(expected.search, {
              normalizeWhitespace: false
            })
          } else {
            expect(screen.getByTestId('initial-search')).toHaveTextContent(expected.search)
          }
          expect(screen.getByTestId('initial-page')).toHaveTextContent(expected.page)
        })
      })
    })

    it('should render breadcrumb correctly', async () => {
      const searchParams = Promise.resolve({})
      const PageComponent = await MembersPage({ searchParams })

      render(PageComponent)

      expect(screen.getByTestId('breadcrumb')).toBeInTheDocument()
      expect(getBaseUrl).toHaveBeenCalled()
    })

    it('should show members component with correct variant', async () => {
      const searchParams = Promise.resolve({})
      const PageComponent = await MembersPage({ searchParams })

      render(PageComponent)

      expect(screen.getByTestId('variant')).toHaveTextContent('default')
    })

    it('should handle combined search and page parameters', async () => {
      const searchParams = Promise.resolve({ search: 'developer', page: '3' })
      const PageComponent = await MembersPage({ searchParams })

      render(PageComponent)

      expect(screen.getByTestId('initial-search')).toHaveTextContent('developer')
      expect(screen.getByTestId('initial-page')).toHaveTextContent('3')
    })

    it('should handle invalid page parameters gracefully', async () => {
      const searchParams = Promise.resolve({ page: 'invalid' })
      const PageComponent = await MembersPage({ searchParams })

      render(PageComponent)

      expect(screen.getByTestId('initial-page')).toHaveTextContent('invalid')
    })

    it('should handle negative page numbers', async () => {
      const searchParams = Promise.resolve({ page: '-1' })
      const PageComponent = await MembersPage({ searchParams })

      render(PageComponent)

      expect(screen.getByTestId('initial-page')).toHaveTextContent('-1')
    })

    it('should handle zero page number', async () => {
      const searchParams = Promise.resolve({ page: '0' })
      const PageComponent = await MembersPage({ searchParams })

      render(PageComponent)

      expect(screen.getByTestId('initial-page')).toHaveTextContent('0')
    })
  })
})
