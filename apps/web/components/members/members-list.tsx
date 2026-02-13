'use client'

import { Avatar, AvatarFallback, AvatarImage } from '@thedaviddias/design-system/avatar'
import { Button } from '@thedaviddias/design-system/button'
import { Calendar, Github, Search } from 'lucide-react'
import Link from 'next/link'
import { useEffect, useMemo, useState } from 'react'
import { useAnalyticsEvents } from '@/components/analytics-tracker'
import { Card, CardContent } from '@/components/ui/card'

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
}

interface MembersListProps {
  members: Member[]
  currentPage: number
  totalPages: number
  totalUsers: number
  hasNextPage: boolean
  hasPrevPage: boolean
}

/**
 * Generates a URL slug from a member's username or ID
 */
function generateSlugFromUser(user: Member): string {
  if (!user) return ''
  const username = user.username || user.publicMetadata?.github_username
  if (!username) return user.id.slice(-8)
  return username
}

/**
 * Renders a paginated and searchable list of community members
 */
export function MembersList({
  members,
  currentPage,
  totalPages,
  totalUsers,
  hasNextPage,
  hasPrevPage
}: MembersListProps) {
  const [searchQuery, setSearchQuery] = useState('')
  const { trackSearch } = useAnalyticsEvents()

  const filteredMembers = useMemo(() => {
    if (!searchQuery.trim()) {
      return members
    }

    const query = searchQuery.toLowerCase()
    return members.filter(user => {
      const displayName =
        user.firstName && user.lastName
          ? `${user.firstName} ${user.lastName}`
          : user.firstName || user.lastName || user.username || 'Member'

      const username = user.username || user.publicMetadata?.github_username

      return displayName.toLowerCase().includes(query) || username?.toLowerCase().includes(query)
    })
  }, [members, searchQuery])

  const filteredCount = filteredMembers.length

  // Track member searches with debouncing
  useEffect(() => {
    if (searchQuery.trim()) {
      const debounceTimer = setTimeout(() => {
        trackSearch(searchQuery, filteredCount, 'members-list-search')
      }, 500)
      return () => clearTimeout(debounceTimer)
    }
  }, [searchQuery, filteredCount, trackSearch])

  return (
    <>
      {/* Search */}
      <div className="relative max-w-md mb-6">
        <input
          type="text"
          placeholder="Search members"
          value={searchQuery}
          onChange={e => setSearchQuery(e.target.value)}
          className="w-full rounded-lg border border-input bg-background px-4 py-2 pl-10 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
        />
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
      </div>

      {/* Results count */}
      <div className="flex items-center gap-4 text-sm text-muted-foreground mb-8">
        <span>
          Showing {searchQuery ? filteredCount : members.length} of {totalUsers} members
        </span>
        {searchQuery && <span>Filtered by "{searchQuery}"</span>}
      </div>

      {/* Members Grid */}
      {filteredMembers.length > 0 ? (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4 mb-8">
            {filteredMembers.map(user => {
              const userSlug = generateSlugFromUser(user)
              const displayName =
                user.firstName && user.lastName
                  ? `${user.firstName} ${user.lastName}`
                  : user.firstName || user.lastName || user.username || 'Member'
              const username = user.username || user.publicMetadata?.github_username
              const joinDate = new Date(user.createdAt).toLocaleDateString('en-US', {
                month: 'short',
                year: 'numeric'
              })

              return (
                <Card key={user.id} className="hover:bg-muted/50 transition-colors">
                  <CardContent className="p-4">
                    <Link
                      href={`/u/${userSlug}`}
                      className="block text-center plausible-event-name=Member+Profile+Click"
                    >
                      <Avatar className="w-16 h-16 mx-auto mb-3">
                        {user.imageUrl ? (
                          <AvatarImage
                            src={user.imageUrl}
                            alt={`${displayName}'s profile picture - llms.txt hub community member`}
                          />
                        ) : (
                          <AvatarFallback className="text-lg">
                            {displayName.charAt(0).toUpperCase()}
                          </AvatarFallback>
                        )}
                      </Avatar>

                      <h3 className="font-medium text-sm mb-1 truncate">{displayName}</h3>

                      {username && (
                        <p className="text-xs text-muted-foreground mb-2 truncate">@{username}</p>
                      )}

                      <div className="flex items-center justify-center gap-1 text-xs text-muted-foreground">
                        <Calendar className="w-3 h-3" />
                        <span>{joinDate}</span>
                      </div>
                    </Link>

                    {username && (
                      <div className="mt-3 pt-3 border-t">
                        <Button variant="outline" size="sm" className="w-full" asChild>
                          <Link
                            href={`https://github.com/${username}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center justify-center gap-1 plausible-event-name=GitHub+Link+Click"
                          >
                            <Github className="w-3 h-3" />
                            <span className="text-xs">GitHub</span>
                          </Link>
                        </Button>
                      </div>
                    )}
                  </CardContent>
                </Card>
              )
            })}
          </div>

          {/* Pagination - only show if not searching */}
          {!searchQuery && totalPages > 1 && (
            <nav className="mx-auto flex w-full justify-center">
              <ul className="flex flex-row items-center gap-1">
                {/* Previous button - always takes up space */}
                <li>
                  <Button variant="outline" disabled={!hasPrevPage} asChild={hasPrevPage}>
                    {hasPrevPage ? (
                      <Link
                        href={currentPage === 2 ? '/members' : `/members/${currentPage - 1}`}
                        className="plausible-event-name=External+Link+Click"
                      >
                        Previous
                      </Link>
                    ) : (
                      <span>Previous</span>
                    )}
                  </Button>
                </li>

                {/* Page numbers */}
                {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                  let pageNum
                  if (totalPages <= 5) {
                    pageNum = i + 1
                  } else if (currentPage <= 3) {
                    pageNum = i + 1
                  } else if (currentPage >= totalPages - 2) {
                    pageNum = totalPages - 4 + i
                  } else {
                    pageNum = currentPage - 2 + i
                  }

                  return (
                    <li key={pageNum}>
                      <Button
                        variant={pageNum === currentPage ? 'default' : 'outline'}
                        size="sm"
                        asChild
                      >
                        <Link
                          href={pageNum === 1 ? '/members' : `/members/${pageNum}`}
                          className="plausible-event-name=External+Link+Click"
                        >
                          {pageNum}
                        </Link>
                      </Button>
                    </li>
                  )
                })}

                {/* Next button - always takes up space */}
                <li>
                  <Button variant="outline" disabled={!hasNextPage} asChild={hasNextPage}>
                    {hasNextPage ? (
                      <Link
                        href={`/members/${currentPage + 1}`}
                        className="plausible-event-name=External+Link+Click"
                      >
                        Next
                      </Link>
                    ) : (
                      <span>Next</span>
                    )}
                  </Button>
                </li>
              </ul>
            </nav>
          )}
        </>
      ) : (
        <div className="text-center py-12">
          <Search className="w-16 h-16 mx-auto mb-4 text-muted-foreground opacity-50" />
          <h2 className="text-xl font-medium mb-2">
            {searchQuery ? 'No members found' : 'No members found'}
          </h2>
          <p className="text-muted-foreground">
            {searchQuery
              ? `No members match "${searchQuery}". Try a different search term.`
              : 'There are no members on this page.'}
          </p>
          {searchQuery && (
            <Button variant="outline" onClick={() => setSearchQuery('')} className="mt-4">
              Clear search
            </Button>
          )}
        </div>
      )}
    </>
  )
}
