import { fireEvent, render, screen } from '@testing-library/react'
import { useRouter } from 'next/navigation'
import { MembersWithLoadMore } from '@/components/examples/members-with-load-more'
import { useContributions } from '@/hooks/use-contributions'
import { useApiLoadMore } from '@/hooks/use-load-more'
import { useMembersList } from '@/hooks/use-members-list'
import { analytics } from '@/lib/analytics'

// Mock dependencies
jest.mock('next/navigation', () => ({
  useRouter: jest.fn()
}))

jest.mock('@/hooks/use-load-more', () => ({
  useApiLoadMore: jest.fn()
}))

jest.mock('@/hooks/use-contributions', () => ({
  useContributions: jest.fn()
}))

jest.mock('@/hooks/use-members-list', () => ({
  useMembersList: jest.fn()
}))

jest.mock('@/lib/analytics', () => ({
  analytics: {
    memberClick: jest.fn(),
    loadMore: jest.fn(),
    search: jest.fn()
  }
}))

jest.mock('@/lib/member-client-utils', () => ({
  getMemberBadgeSync: jest.fn(hasContributions => ({
    variant: hasContributions ? 'default' : 'secondary',
    label: hasContributions ? 'Contributor' : 'Member'
  }))
}))

const mockRouter = {
  replace: jest.fn()
}

const mockUseApiLoadMore = useApiLoadMore as jest.MockedFunction<typeof useApiLoadMore>
const mockUseContributions = useContributions as jest.MockedFunction<typeof useContributions>
const mockUseMembersList = useMembersList as jest.MockedFunction<typeof useMembersList>
const mockUseRouter = useRouter as jest.MockedFunction<typeof useRouter>

const mockMembers = [
  {
    id: 'user1',
    firstName: 'John',
    lastName: 'Doe',
    username: 'johndoe',
    imageUrl: 'https://example.com/john.jpg',
    createdAt: '2022-12-01T00:00:00.000Z',
    publicMetadata: {
      github_username: 'johndoe',
      migrated_from: null
    }
  },
  {
    id: 'user2',
    firstName: null,
    lastName: null,
    username: 'janedoe',
    imageUrl: null,
    createdAt: '2023-01-01T00:00:00.000Z',
    publicMetadata: {
      github_username: 'janedoe',
      migrated_from: null
    }
  },
  {
    id: 'user3',
    firstName: 'Bob',
    lastName: null,
    username: null,
    imageUrl: 'https://example.com/bob.jpg',
    createdAt: '2023-02-01T00:00:00.000Z',
    publicMetadata: {
      github_username: null,
      migrated_from: null
    }
  }
]

describe('MembersWithLoadMore', () => {
  const defaultUseMembersListReturn = {
    searchQuery: '',
    memberFilter: 'all' as const,
    searchDebounced: '',
    isInfiniteScrolling: false,
    members: mockMembers,
    filteredMembers: mockMembers,
    hasMore: true,
    isLoading: false,
    isLoadingMore: false,
    currentPage: 1,
    totalCount: 50,
    error: null,
    handleSearchChange: jest.fn(),
    handleFilterChange: jest.fn(),
    handleLoadMore: jest.fn(),
    loadMoreRef: { current: null }
  }

  beforeEach(() => {
    jest.clearAllMocks()

    mockUseRouter.mockReturnValue(mockRouter as any)
    mockUseMembersList.mockReturnValue(defaultUseMembersListReturn)

    // Keep the other mocks for backwards compatibility
    mockUseApiLoadMore.mockReturnValue({
      items: mockMembers,
      hasMore: true,
      isLoading: false,
      isLoadingMore: false,
      currentPage: 1,
      totalPages: 5,
      totalCount: 50,
      error: null,
      loadMore: jest.fn(),
      reset: jest.fn(),
      refetch: jest.fn()
    })

    mockUseContributions.mockReturnValue({
      contributions: {
        johndoe: true,
        janedoe: false
      },
      isLoading: false,
      error: null,
      refetch: jest.fn()
    })
  })

  it('should render members list with correct data', () => {
    render(<MembersWithLoadMore />)

    expect(screen.getByText('John Doe')).toBeInTheDocument()
    expect(screen.getByText('@johndoe')).toBeInTheDocument()
    expect(screen.getByText('@janedoe')).toBeInTheDocument()
    expect(screen.getByText('Bob')).toBeInTheDocument()
  })

  it('should handle search functionality', async () => {
    const mockHandleSearchChange = jest.fn()
    mockUseMembersList.mockReturnValue({
      ...defaultUseMembersListReturn,
      searchQuery: 'john',
      handleSearchChange: mockHandleSearchChange
    })

    render(<MembersWithLoadMore />)

    const searchInput = screen.getByPlaceholderText('Search members...')
    expect(searchInput).toHaveValue('john')

    fireEvent.change(searchInput, { target: { value: 'jane' } })

    expect(mockHandleSearchChange).toHaveBeenCalledWith('jane')
  })

  it('should clear search when input is emptied', async () => {
    const mockHandleSearchChange = jest.fn()
    mockUseMembersList.mockReturnValue({
      ...defaultUseMembersListReturn,
      searchQuery: 'john',
      handleSearchChange: mockHandleSearchChange
    })

    render(<MembersWithLoadMore />)

    const searchInput = screen.getByPlaceholderText('Search members...')
    fireEvent.change(searchInput, { target: { value: '' } })

    expect(mockHandleSearchChange).toHaveBeenCalledWith('')
  })

  it('should show loading skeleton when initially loading', () => {
    mockUseMembersList.mockReturnValue({
      ...defaultUseMembersListReturn,
      filteredMembers: [],
      isLoading: true,
      totalCount: 0
    })

    render(<MembersWithLoadMore />)

    // Should show skeleton loading cards
    const skeletonCards = screen
      .getAllByRole('generic')
      .filter(el => el.className.includes('animate-pulse'))
    expect(skeletonCards.length).toBeGreaterThan(0)
  })

  it('should show error state when API fails', () => {
    mockUseMembersList.mockReturnValue({
      ...defaultUseMembersListReturn,
      filteredMembers: [],
      error: 'Failed to load members',
      totalCount: 0
    })

    render(<MembersWithLoadMore />)

    expect(screen.getByText('Error loading members: Failed to load members')).toBeInTheDocument()
  })

  it('should show empty state when no members found', () => {
    mockUseMembersList.mockReturnValue({
      ...defaultUseMembersListReturn,
      filteredMembers: [],
      totalCount: 0,
      isLoading: false
    })

    render(<MembersWithLoadMore />)

    expect(screen.getByText('No members found')).toBeInTheDocument()
    expect(screen.getByText('No members yet')).toBeInTheDocument()
  })

  it('should call loadMore when load more button is clicked', () => {
    const mockHandleLoadMore = jest.fn()
    mockUseMembersList.mockReturnValue({
      ...defaultUseMembersListReturn,
      filteredMembers: mockMembers,
      hasMore: true,
      handleLoadMore: mockHandleLoadMore
    })

    render(<MembersWithLoadMore variant="button" />)

    const loadMoreButton = screen.getByText('Load More Members')
    fireEvent.click(loadMoreButton)

    expect(mockHandleLoadMore).toHaveBeenCalled()
  })

  it('should track analytics when member is clicked', () => {
    render(<MembersWithLoadMore />)

    const memberLink = screen.getAllByRole('link')[0]
    fireEvent.click(memberLink)

    expect(analytics.memberClick).toHaveBeenCalledWith('John Doe', 'johndoe', 'members-list')
  })

  it('should handle different variants properly', () => {
    // First test button variant
    mockUseMembersList.mockReturnValue({
      ...defaultUseMembersListReturn,
      hasMore: true
    })

    const { rerender } = render(<MembersWithLoadMore variant="button" />)
    expect(screen.getByText('Load More Members')).toBeInTheDocument()

    rerender(<MembersWithLoadMore variant="auto" />)
    // Auto variant should still show the load more component but with different behavior
    expect(mockUseMembersList).toHaveBeenCalledWith({ variant: 'auto' })

    rerender(<MembersWithLoadMore variant="scroll" />)
    // Scroll variant might not show load more button in certain conditions
    expect(mockUseMembersList).toHaveBeenCalledWith({ variant: 'scroll' })
  })

  it('should filter members based on contribution status', () => {
    const contributorMembers = [mockMembers[0]] // Only John Doe

    mockUseMembersList.mockReturnValue({
      ...defaultUseMembersListReturn,
      memberFilter: 'contributors',
      filteredMembers: contributorMembers,
      totalCount: 1,
      isLoading: false
    })

    render(<MembersWithLoadMore />)

    // Should only show contributor when filter is applied
    expect(screen.getByText('John Doe')).toBeInTheDocument()
    expect(screen.queryByText('@janedoe')).not.toBeInTheDocument()
  })
})
