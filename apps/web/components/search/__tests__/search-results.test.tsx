import { SearchResults } from '@/components/search/search-results'
import { useSearch } from '@/components/search/use-search'
import { render, screen } from '@testing-library/react'

// Mock Next.js navigation hooks
jest.mock('next/navigation', () => ({
  useSearchParams: jest.fn()
}))

// Mock the useSearch hook
jest.mock('../use-search')
const mockUseSearch = useSearch as jest.MockedFunction<typeof useSearch>
const mockUseSearchParams = require('next/navigation').useSearchParams as jest.MockedFunction<any>

// Mock child components
jest.mock('@/components/empty-state', () => ({
  EmptyState: ({
    title,
    description,
    actionLabel
  }: {
    title: string
    description: string
    actionLabel: string
  }) => (
    <div>
      <h2>{title}</h2>
      <p>{description}</p>
      <a href="/test">{actionLabel}</a>
    </div>
  )
}))

jest.mock('@/components/search/search-filters', () => ({
  SearchFilters: () => <div>Search Filters</div>
}))

jest.mock('@/components/websites-list-with-sort', () => ({
  WebsitesListWithSort: ({ initialWebsites }: { initialWebsites: any[] }) => (
    <div>
      {initialWebsites.map(result => (
        <div key={result.slug} data-testid={`result-${result.slug}`}>
          <h3>{result.name}</h3>
          <p>{result.description}</p>
          <span>{result.category}</span>
        </div>
      ))}
    </div>
  )
}))

jest.mock('@/lib/routes', () => ({
  getRoute: jest.fn(() => '/')
}))

const mockResults = [
  {
    slug: 'example-site',
    name: 'Example Site',
    description: 'A test website',
    website: 'https://example.com',
    category: 'Tools',
    categories: ['Tools'],
    tags: ['test', 'example'],
    llmsUrl: 'https://example.com/llms.txt',
    llmsFullUrl: 'https://example.com/llms-full.txt',
    publishedAt: '2023-01-01'
  },
  {
    slug: 'another-site',
    name: 'Another Site',
    description: 'Another test website',
    website: 'https://another.com',
    category: 'Education',
    categories: ['Education'],
    tags: ['learning', 'education'],
    llmsUrl: 'https://another.com/llms.txt',
    llmsFullUrl: 'https://another.com/llms-full.txt',
    publishedAt: '2023-01-02'
  },
  {
    slug: 'third-site',
    name: 'Third Site',
    description: 'Third test website',
    website: 'https://third.com',
    category: 'Tools',
    categories: ['Tools'],
    tags: ['utility', 'tools'],
    llmsUrl: 'https://third.com/llms.txt',
    llmsFullUrl: 'https://third.com/llms-full.txt',
    publishedAt: '2023-01-03'
  }
]

describe('SearchResults', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    // Mock search params to return empty by default
    mockUseSearchParams.mockReturnValue({
      get: jest.fn(() => '')
    })
  })

  it('should display loading state', () => {
    mockUseSearchParams.mockReturnValue({
      get: jest.fn(() => 'test')
    })
    mockUseSearch.mockReturnValue({
      results: [],
      loading: true,
      error: null
    })

    render(<SearchResults />)

    // Look for the spinner element
    expect(document.querySelector('.animate-spin')).toBeInTheDocument()
  })

  it('should display error state', () => {
    const errorMessage = 'Search failed'
    mockUseSearchParams.mockReturnValue({
      get: jest.fn(() => 'test')
    })
    mockUseSearch.mockReturnValue({
      results: [],
      loading: false,
      error: errorMessage
    })

    render(<SearchResults />)

    expect(screen.getByText('Something went wrong')).toBeInTheDocument()
    expect(screen.getByText(errorMessage)).toBeInTheDocument()
    expect(screen.getByText('Refresh Page')).toBeInTheDocument()
  })

  it('should display start search message when no query', () => {
    mockUseSearchParams.mockReturnValue({
      get: jest.fn(() => '')
    })
    mockUseSearch.mockReturnValue({
      results: [],
      loading: false,
      error: null
    })

    render(<SearchResults />)

    expect(screen.getByText('Start Your Search')).toBeInTheDocument()
    expect(screen.getByText(/Type something in the search bar above/)).toBeInTheDocument()
    expect(screen.getByText('Explore All Projects')).toBeInTheDocument()
  })

  it('should display no results found when query returns empty', () => {
    mockUseSearchParams.mockReturnValue({
      get: jest.fn(() => 'nonexistent')
    })
    mockUseSearch.mockReturnValue({
      results: [],
      loading: false,
      error: null
    })

    render(<SearchResults />)

    expect(screen.getByText('Nothing Found')).toBeInTheDocument()
    expect(screen.getByText(/We couldn't find any results for/)).toBeInTheDocument()
  })

  it('should display search results', () => {
    mockUseSearchParams.mockReturnValue({
      get: jest.fn(() => 'test')
    })
    mockUseSearch.mockReturnValue({
      results: mockResults,
      loading: false,
      error: null
    })

    render(<SearchResults />)

    expect(screen.getByTestId('result-example-site')).toBeInTheDocument()
    expect(screen.getByTestId('result-another-site')).toBeInTheDocument()
    expect(screen.getByTestId('result-third-site')).toBeInTheDocument()

    expect(screen.getByText('Example Site')).toBeInTheDocument()
    expect(screen.getByText('Another Site')).toBeInTheDocument()
    expect(screen.getByText('Third Site')).toBeInTheDocument()
  })

  it('should show category filters when more than 3 results', () => {
    const manyResults = [
      ...mockResults,
      {
        slug: 'fourth-site',
        name: 'Fourth Site',
        description: 'Fourth test website',
        website: 'https://fourth.com',
        category: 'Education',
        categories: ['Education'],
        tags: ['learning'],
        llmsUrl: 'https://fourth.com/llms.txt',
        llmsFullUrl: 'https://fourth.com/llms-full.txt',
        publishedAt: '2023-01-04'
      }
    ]

    mockUseSearchParams.mockReturnValue({
      get: jest.fn(() => 'test')
    })
    mockUseSearch.mockReturnValue({
      results: manyResults,
      loading: false,
      error: null
    })

    render(<SearchResults />)

    expect(screen.getByText(/Results by category:/)).toBeInTheDocument()
    expect(screen.getByText(/Tools \(2\)/)).toBeInTheDocument()
    expect(screen.getByText(/Education \(2\)/)).toBeInTheDocument()
  })

  it('should pass correct query to useSearch hook', () => {
    const query = 'specific search term'
    mockUseSearchParams.mockReturnValue({
      get: jest.fn(() => query)
    })
    mockUseSearch.mockReturnValue({
      results: [],
      loading: false,
      error: null
    })

    render(<SearchResults />)

    expect(mockUseSearch).toHaveBeenCalledWith(query)
  })

  it('should handle empty query gracefully', () => {
    mockUseSearchParams.mockReturnValue({
      get: jest.fn(() => '')
    })
    mockUseSearch.mockReturnValue({
      results: [],
      loading: false,
      error: null
    })

    render(<SearchResults />)

    expect(screen.getByText('Start Your Search')).toBeInTheDocument()
  })

  it('should render error message when search hook returns error', () => {
    mockUseSearchParams.mockReturnValue({
      get: jest.fn(() => 'test')
    })
    mockUseSearch.mockReturnValue({
      results: [],
      loading: false,
      error: 'Network error'
    })

    render(<SearchResults />)

    expect(screen.getByText('Something went wrong')).toBeInTheDocument()
    expect(screen.getByText('Network error')).toBeInTheDocument()
  })

  it('should call useSearch with provided query parameter', () => {
    const testQuery = 'machine learning'
    mockUseSearchParams.mockReturnValue({
      get: jest.fn(() => testQuery)
    })
    mockUseSearch.mockReturnValue({
      results: mockResults,
      loading: false,
      error: null
    })

    render(<SearchResults />)

    expect(mockUseSearch).toHaveBeenCalledWith(testQuery)
    expect(mockUseSearch).toHaveBeenCalledTimes(1)
  })
})
