'use client'

import { Button } from '@thedaviddias/design-system/button'
import { AlertCircle, Users } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { useMembersList } from '@/hooks/use-members-list'
import { analytics } from '@/lib/analytics'
import { MemberCardItem } from './member-card-item'
import { MembersSearchControls } from './members-search-controls'

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

interface MembersWithLoadMoreProps {
  variant?: 'button' | 'auto' | 'scroll'
}

/**
 * Generates a URL slug from a user's username or ID
 * @param user - Member object to generate slug from
 * @returns URL-safe slug string for user profile
 */
function generateSlugFromUser(user: Member): string {
  if (!user) return ''
  const username = user.username || user.publicMetadata?.github_username
  // Use full user ID for email-only users
  if (!username) return user.id
  return username
}

/**
 * Interactive component displaying community members with pagination and search functionality
 * @param props - Component props
 * @param props.variant - Loading behavior: 'scroll' for infinite scroll, 'button' for manual load, 'auto' for automatic
 * @returns JSX component with member cards, search, and pagination
 */
export function MembersWithLoadMore({ variant = 'scroll' }: MembersWithLoadMoreProps) {
  const {
    searchQuery,
    memberFilter,
    filteredMembers,
    hasMore,
    isLoading,
    isLoadingMore,
    totalCount,
    error,
    handleSearchChange,
    handleFilterChange,
    handleLoadMore,
    loadMoreRef
  } = useMembersList({ variant })

  // Show error state
  if (error) {
    return (
      <div className="flex items-center justify-center py-12">
        <Card>
          <CardContent className="flex items-center space-x-2 pt-6">
            <AlertCircle className="h-5 w-5 text-destructive" />
            <p>Error loading members: {error}</p>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <MembersSearchControls
        searchQuery={searchQuery}
        memberFilter={memberFilter}
        totalMembers={totalCount}
        onSearchChange={handleSearchChange}
        onFilterChange={handleFilterChange}
      />

      {/* Member Count */}
      {totalCount > 0 && (
        <p className="text-sm text-muted-foreground">
          Showing {filteredMembers.length} of {totalCount} members
          {searchQuery && ` matching "${searchQuery}"`}
        </p>
      )}

      {/* Loading State */}
      {isLoading ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {[...Array(20)].map((_, i) => (
            <Card key={i} className="animate-pulse">
              <CardContent className="p-4">
                <div className="flex flex-col items-center space-y-3">
                  <div className="h-16 w-16 rounded-full bg-muted" />
                  <div className="space-y-2 text-center">
                    <div className="h-4 w-24 bg-muted rounded" />
                    <div className="h-3 w-16 bg-muted rounded" />
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <>
          {/* Members Grid */}
          {filteredMembers.length > 0 ? (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {filteredMembers.map(member => {
                const userSlug = generateSlugFromUser(member)
                const username = member.username || member.publicMetadata?.github_username

                /**
                 * Handles member profile click analytics tracking
                 */
                const handleMemberClick = () => {
                  const displayName =
                    member.firstName && member.lastName
                      ? `${member.firstName} ${member.lastName}`
                      : member.firstName || member.lastName || username || 'Anonymous'

                  analytics.memberClick(displayName, userSlug, 'members-list')
                }

                return (
                  <MemberCardItem
                    key={member.id}
                    member={member}
                    userSlug={userSlug}
                    onClick={handleMemberClick}
                  />
                )
              })}
            </div>
          ) : (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-12 text-center">
                <Users className="mb-4 h-12 w-12 text-muted-foreground" />
                <p className="text-lg font-semibold">No members found</p>
                <p className="text-sm text-muted-foreground mt-1">
                  {searchQuery
                    ? `No members match "${searchQuery}"`
                    : memberFilter !== 'all'
                      ? 'No members in this category'
                      : 'No members yet'}
                </p>
              </CardContent>
            </Card>
          )}

          {/* Load More */}
          {hasMore && (
            <div className="flex justify-center py-4">
              {variant === 'button' && (
                <Button
                  onClick={handleLoadMore}
                  disabled={isLoadingMore}
                  variant="outline"
                  size="lg"
                >
                  {isLoadingMore ? 'Loading...' : 'Load More Members'}
                </Button>
              )}

              {/* Infinite scroll trigger */}
              <div ref={loadMoreRef} className="h-1 w-full" />

              {isLoadingMore && variant !== 'button' && (
                <div className="text-center py-4">
                  <div className="inline-flex items-center space-x-2">
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary" />
                    <span className="text-sm text-muted-foreground">Loading more members...</span>
                  </div>
                </div>
              )}
            </div>
          )}
        </>
      )}
    </div>
  )
}
