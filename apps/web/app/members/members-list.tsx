'use client'

import { logger } from '@thedaviddias/logging'
import { usePathname, useRouter, useSearchParams } from 'next/navigation'
import { useCallback, useEffect, useState } from 'react'
import type { Member } from '@/lib/member-server-utils'
import { generateSlugFromUser } from '@/lib/profile-utils'
import { MemberCard } from './member-card'

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
 * Handles pagination navigation and server-side search
 */
export function MembersList({
  initialMembers,
  initialTotalCount,
  initialPage,
  initialSearchQuery = ''
}: MembersListProps) {
  const searchParams = useSearchParams()
  const router = useRouter()
  const pathname = usePathname()
  const [members, setMembers] = useState<Member[]>(initialMembers)
  const [totalCount, setTotalCount] = useState(initialTotalCount)
  const [currentPage, setCurrentPage] = useState(initialPage)
  const [isLoading, setIsLoading] = useState(false)
  const [searchQuery, setSearchQuery] = useState(initialSearchQuery)

  const totalPages = Math.ceil(totalCount / 24)

  /**
   * Fetch members from the API with pagination and search
   */
  const fetchMembers = useCallback(async (page: number, search: string) => {
    setIsLoading(true)
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
        setMembers(data.members)
        setTotalCount(data.totalCount)
      }
    } catch (error) {
      logger.error(error instanceof Error ? error : new Error(String(error)), {
        data: error,
        tags: { type: 'component', component: 'members-list' }
      })
    } finally {
      setIsLoading(false)
    }
  }, [])

  // Update state when search params change
  useEffect(() => {
    const newSearchQuery = searchParams.get('search') || ''
    const newPage = Number.parseInt(searchParams.get('page') || '1', 10)

    // Only update if the URL params are different from current state
    if (newSearchQuery !== searchQuery || newPage !== currentPage) {
      setSearchQuery(newSearchQuery)
      setCurrentPage(newPage)

      // Fetch new data
      fetchMembers(newPage, newSearchQuery)
    }
  }, [searchParams, fetchMembers])

  /**
   * Navigate to a specific page
   */
  const goToPage = useCallback(
    (page: number) => {
      if (page < 1 || page > totalPages || page === currentPage || isLoading) return

      const params = new URLSearchParams(searchParams)
      params.set('page', page.toString())
      router.push(`${pathname}?${params.toString()}`)
    },
    [currentPage, totalPages, isLoading, searchParams, router, pathname]
  )

  /**
   * Generate page numbers to display
   */
  const getPageNumbers = useCallback(() => {
    const pages: (number | string)[] = []
    const maxVisible = 7 // Show up to 7 page numbers

    if (totalPages <= maxVisible) {
      // Show all pages if total is small
      for (let i = 1; i <= totalPages; i++) {
        pages.push(i)
      }
    } else {
      // Always show first page
      pages.push(1)

      if (currentPage > 4) {
        pages.push('...')
      }

      // Show pages around current page
      const start = Math.max(2, currentPage - 1)
      const end = Math.min(totalPages - 1, currentPage + 1)

      for (let i = start; i <= end; i++) {
        if (i !== 1 && i !== totalPages) {
          pages.push(i)
        }
      }

      if (currentPage < totalPages - 3) {
        pages.push('...')
      }

      // Always show last page
      if (totalPages > 1) {
        pages.push(totalPages)
      }
    }

    return pages
  }, [currentPage, totalPages])

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

      {/* Pagination */}
      {totalPages > 1 && (
        <nav className="flex items-center justify-center gap-1" aria-label="Pagination Navigation">
          {/* Previous Button */}
          <button
            type="button"
            onClick={() => goToPage(currentPage - 1)}
            disabled={currentPage === 1 || isLoading}
            className="inline-flex items-center gap-1 px-3 py-2 text-sm font-medium rounded-md border border-input bg-background text-muted-foreground hover:bg-accent hover:text-accent-foreground transition-colors disabled:pointer-events-none disabled:opacity-50"
            aria-label="Go to previous page"
          >
            <svg className="size-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <title>Previous page</title>
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M15 19l-7-7 7-7"
              />
            </svg>
            <span className="hidden sm:inline">Previous</span>
          </button>

          {/* Page Numbers */}
          <div className="flex items-center gap-1">
            {getPageNumbers().map((page, index) => (
              <div key={index}>
                {page === '...' ? (
                  <span className="inline-flex size-9 items-center justify-center text-sm text-muted-foreground">
                    ...
                  </span>
                ) : (
                  <button
                    type="button"
                    onClick={() => goToPage(page as number)}
                    disabled={isLoading}
                    className={`inline-flex size-9 items-center justify-center rounded-md text-sm font-medium transition-colors disabled:pointer-events-none disabled:opacity-50 ${
                      currentPage === page
                        ? 'bg-primary text-primary-foreground shadow-sm'
                        : 'border border-input bg-background hover:bg-accent hover:text-accent-foreground'
                    }`}
                    aria-label={`Go to page ${page}`}
                    aria-current={currentPage === page ? 'page' : undefined}
                  >
                    {page}
                  </button>
                )}
              </div>
            ))}
          </div>

          {/* Next Button */}
          <button
            type="button"
            onClick={() => goToPage(currentPage + 1)}
            disabled={currentPage === totalPages || isLoading}
            className="inline-flex items-center gap-1 px-3 py-2 text-sm font-medium rounded-md border border-input bg-background text-muted-foreground hover:bg-accent hover:text-accent-foreground transition-colors disabled:pointer-events-none disabled:opacity-50"
            aria-label="Go to next page"
          >
            <span className="hidden sm:inline">Next</span>
            <svg className="size-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <title>Next page</title>
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </button>
        </nav>
      )}

      {/* Loading indicator */}
      {isLoading && (
        <div className="flex justify-center py-4">
          <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
        </div>
      )}

      {/* Results summary */}
      <div className="text-center">
        <p className="text-sm text-muted-foreground">
          {searchQuery
            ? `Showing ${members.length} of ${totalCount} results for "${searchQuery}"`
            : `Showing ${members.length} of ${totalCount} members`}
          {totalPages > 1 && ` • Page ${currentPage} of ${totalPages}`}
        </p>
      </div>
    </div>
  )
}
