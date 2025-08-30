import { useContributions } from '@/hooks/use-contributions'
import { useApiLoadMore } from '@/hooks/use-load-more'
import { analytics } from '@/lib/analytics'
import { parseAsInteger, parseAsString, useQueryState } from 'nuqs'
import { useCallback, useEffect, useRef, useState } from 'react'

interface Member {
  id: string
  firstName?: string | null
  lastName?: string | null
  username?: string | null
  imageUrl?: string | null
  createdAt: string
  publicMetadata?: {
    github_username?: string | null
    migrated_from?: string | null
  }
  hasContributions?: boolean
}

type MemberFilter = 'all' | 'contributors' | 'community'

const memberFilterParser = parseAsString.withDefault('all')

interface UseMembersListProps {
  variant?: 'button' | 'auto' | 'scroll'
}

interface UseMembersListReturn {
  // State
  searchQuery: string
  memberFilter: MemberFilter
  searchDebounced: string
  isInfiniteScrolling: boolean

  // Data
  members: Member[]
  filteredMembers: Member[]
  hasMore: boolean
  isLoading: boolean
  isLoadingMore: boolean
  currentPage: number
  totalCount: number
  error: string | null

  // Actions
  handleSearchChange: (value: string) => void
  handleFilterChange: (filter: MemberFilter) => void
  handleLoadMore: () => void

  // Refs
  loadMoreRef: React.RefObject<HTMLDivElement | null>
}

/**
 * Custom hook for managing members list state and functionality
 * @param props - Hook configuration
 * @param props.variant - Loading behavior type
 * @returns Object containing all members list state and handlers
 */
export function useMembersList({
  variant = 'scroll'
}: UseMembersListProps = {}): UseMembersListReturn {
  // URL state management
  const [page, setPage] = useQueryState('page', parseAsInteger.withDefault(1))
  const [searchQuery, setSearchQuery] = useQueryState('search', parseAsString.withDefault(''))
  const [memberFilterRaw, setMemberFilterRaw] = useQueryState('filter', memberFilterParser)

  // Validate and ensure memberFilter is of correct type
  const memberFilter: MemberFilter =
    memberFilterRaw === 'contributors' || memberFilterRaw === 'community' ? memberFilterRaw : 'all'

  const [searchDebounced, setSearchDebounced] = useState(searchQuery)
  const loadMoreRef = useRef<HTMLDivElement>(null)
  const [isInfiniteScrolling, setIsInfiniteScrolling] = useState(false)

  // Debounce search query
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      setSearchDebounced(searchQuery)
      // Reset to page 1 when search changes
      if (searchQuery !== searchDebounced) {
        setPage(1)
      }
    }, 300)
    return () => clearTimeout(timeoutId)
  }, [searchQuery, searchDebounced, setPage])

  // Use API-based loading
  const {
    items: members,
    hasMore,
    isLoading,
    isLoadingMore,
    currentPage,
    totalCount,
    error,
    loadMore
  } = useApiLoadMore<Member>({
    apiEndpoint: '/api/members',
    initialPage: page,
    itemsPerPage: 20,
    searchQuery: searchDebounced,
    filter: memberFilter === 'all' ? undefined : memberFilter
  })

  // Get usernames for contribution lookup
  const usernames = members
    .map(member => member.username || member.publicMetadata?.github_username)
    .filter((username): username is string => Boolean(username))

  // Fetch contribution data
  const { contributions } = useContributions({
    usernames,
    enabled: usernames.length > 0
  })

  // Merge contribution data with members
  const filteredMembers = members.map(member => {
    const username = member.username || member.publicMetadata?.github_username
    const hasContributions = username ? contributions[username] === true : false

    return {
      ...member,
      hasContributions
    }
  })

  // Handlers
  const handleSearchChange = useCallback(
    (value: string) => {
      setSearchQuery(value)
      analytics.search(value, filteredMembers.length, 'members-page')
    },
    [setSearchQuery, filteredMembers.length]
  )

  const handleFilterChange = useCallback(
    (filter: MemberFilter) => {
      setMemberFilterRaw(filter)
      setPage(1)
      // Use generic trackEvent for filter changes as there's no specific method
      analytics.search(`filter:${filter}`, filteredMembers.length, 'members-filter')
    },
    [setMemberFilterRaw, setPage, filteredMembers.length]
  )

  const handleLoadMore = useCallback(() => {
    if (hasMore && !isLoadingMore) {
      loadMore()
      analytics.loadMore('members', filteredMembers.length, totalCount, 'members-page')
    }
  }, [hasMore, isLoadingMore, loadMore, filteredMembers.length, totalCount])

  // Infinite scroll setup
  useEffect(() => {
    if (variant !== 'scroll') return

    const observer = new IntersectionObserver(
      entries => {
        const target = entries[0]
        if (target?.isIntersecting && hasMore && !isLoadingMore && !isInfiniteScrolling) {
          setIsInfiniteScrolling(true)
          handleLoadMore()
          setTimeout(() => setIsInfiniteScrolling(false), 1000)
        }
      },
      {
        rootMargin: '100px'
      }
    )

    const currentRef = loadMoreRef.current
    if (currentRef) {
      observer.observe(currentRef)
    }

    return () => {
      if (currentRef) {
        observer.unobserve(currentRef)
      }
    }
  }, [variant, hasMore, isLoadingMore, handleLoadMore, isInfiniteScrolling])

  return {
    // State
    searchQuery,
    memberFilter,
    searchDebounced,
    isInfiniteScrolling,

    // Data
    members,
    filteredMembers,
    hasMore,
    isLoading,
    isLoadingMore,
    currentPage,
    totalCount,
    error,

    // Actions
    handleSearchChange,
    handleFilterChange,
    handleLoadMore,

    // Refs
    loadMoreRef
  }
}
