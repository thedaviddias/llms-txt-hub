'use client'

import { useCallback, useEffect, useState } from 'react'
import { useSearchParams } from 'next/navigation'
import { MemberCard } from './member-card'
import { generateSlugFromUser } from '@/lib/profile-utils'
import type { Member } from '@/lib/member-server-utils'

interface MembersListProps {
  initialMembers: Member[]
  initialTotalCount: number
  initialPage: number
  initialSearchQuery?: string
}

interface PaginatedMembersResponse {
  members: Member[]
  totalCount: number
  page: number
  totalPages: number
  hasMore: boolean
}

/**
 * Client-side members list with pagination and search
 * Handles loading more members and server-side search
 */
export function MembersList({
  initialMembers,
  initialTotalCount,
  initialPage,
  initialSearchQuery = ''
}: MembersListProps) {
  const searchParams = useSearchParams()
  const [members, setMembers] = useState<Member[]>(initialMembers)
  const [totalCount, setTotalCount] = useState(initialTotalCount)
  const [currentPage, setCurrentPage] = useState(initialPage)
  const [isLoadingMore, setIsLoadingMore] = useState(false)
  const [hasMore, setHasMore] = useState(initialMembers.length < initialTotalCount)
  const [searchQuery, setSearchQuery] = useState(initialSearchQuery)

  // Update state when search params change
  useEffect(() => {
    const newSearchQuery = searchParams.get('search') || ''
    const newPage = Number.parseInt(searchParams.get('page') || '1', 10)
    
    if (newSearchQuery !== searchQuery || newPage !== currentPage) {
      setSearchQuery(newSearchQuery)
      setCurrentPage(newPage)
      
      // Fetch new data
      fetchMembers(newPage, newSearchQuery)
    }
  }, [searchParams, searchQuery, currentPage])

  /**
   * Fetch members from the API with pagination and search
   */
  const fetchMembers = useCallback(async (page: number, search: string) => {
    try {
      const params = new URLSearchParams({
        page: page.toString(),
        limit: '24'
      })
      
      if (search.trim()) {
        params.set('search', search.trim())
      }

      const response = await fetch(`/api/members/paginated?${params.toString()}`)
      if (response.ok) {
        const data: PaginatedMembersResponse = await response.json()
        
        if (page === 1) {
          // Replace members for first page or new search
          setMembers(data.members)
        } else {
          // Append members for pagination
          setMembers(prev => [...prev, ...data.members])
        }
        
        setTotalCount(data.totalCount)
        setHasMore(data.hasMore)
      }
    } catch (error) {
      console.error('Failed to fetch members:', error)
    }
  }, [])

  /**
   * Load more members for pagination
   */
  const loadMoreMembers = useCallback(async () => {
    if (isLoadingMore || !hasMore) return

    setIsLoadingMore(true)
    try {
      const nextPage = currentPage + 1
      await fetchMembers(nextPage, searchQuery)
      setCurrentPage(nextPage)
    } finally {
      setIsLoadingMore(false)
    }
  }, [isLoadingMore, hasMore, currentPage, searchQuery, fetchMembers])

  return (
    <div className="space-y-6">
      {/* Members Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-4">
        {members.map(member => {
          const userSlug = generateSlugFromUser(member)
          const displayName =
            member.firstName && member.lastName
              ? `${member.firstName} ${member.lastName}`
              : member.firstName || member.lastName || member.username || 'Anonymous'

          return (
            <MemberCard
              key={member.id}
              member={member}
              userSlug={userSlug}
              displayName={displayName}
            />
          )
        })}
      </div>

      {/* Load More Button */}
      {hasMore && (
        <div className="text-center" aria-live="polite">
          <button
            type="button"
            onClick={loadMoreMembers}
            disabled={isLoadingMore}
            className="inline-flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-md text-sm font-medium hover:bg-primary/90 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors min-h-[36px]"
            aria-label={`Load more members. Currently showing ${members.length} of ${totalCount} members.`}
          >
            {isLoadingMore ? (
              <>
                <div className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
                <span>Loading...</span>
              </>
            ) : (
              <>
                <span>Load More</span>
                <span className="text-sm opacity-75">
                  ({totalCount - members.length} remaining)
                </span>
              </>
            )}
          </button>

          {/* Progress indicator */}
          <p className="text-xs text-muted-foreground mt-3">
            Showing {members.length} of {totalCount} members
          </p>
        </div>
      )}

      {/* End of results */}
      {!hasMore && members.length > 0 && (
        <div className="text-center">
          <p className="text-sm text-muted-foreground">
            {searchQuery
              ? `Showing all ${members.length} results for "${searchQuery}"`
              : `You've reached the end! Showing all ${members.length} members.`}
          </p>
        </div>
      )}
    </div>
  )
}
