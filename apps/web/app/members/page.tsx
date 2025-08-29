import { Avatar, AvatarFallback, AvatarImage } from '@thedaviddias/design-system/avatar'
import { Badge } from '@thedaviddias/design-system/badge'
import { Calendar } from 'lucide-react'
import Link from 'next/link'
import { Card, CardContent } from '@/components/ui/card'
import { getCachedMembers, type Member } from '@/lib/member-server-utils'
import { getMemberBadgeSync } from '@/lib/member-client-utils'
import { MembersSearch } from './members-search'

// Force dynamic rendering since we use searchParams
export const dynamic = 'force-dynamic'

// Revalidate every 30 minutes
export const revalidate = 1800

/**
 * Generate a URL-safe slug from user data
 *
 * @param user - Member object
 * @returns URL-safe slug string
 */
function generateSlugFromUser(user: Member): string {
  if (!user) return ''
  const username = user.username || user.publicMetadata?.github_username
  if (!username) return user.id
  return username
}

/**
 * Generate metadata for the members page
 *
 * @returns Metadata object for Next.js
 */
export async function generateMetadata() {
  const members = await getCachedMembers()

  return {
    title: `Members (${members.length}) | LLMs.txt Hub`,
    description: `Browse ${members.length} members of the LLMs.txt Hub community. Connect with developers, creators, and contributors.`,
    openGraph: {
      title: `${members.length} Members | LLMs.txt Hub`,
      description:
        'Join our growing community of developers and creators sharing their LLMs.txt files'
    }
  }
}

export default async function MembersPage({
  searchParams
}: {
  searchParams: Promise<{ search?: string; filter?: string; page?: string }>
}) {
  // Get all members (this will be cached and served statically)
  const allMembers = await getCachedMembers()

  // Await search params in Next.js 15
  const params = await searchParams

  // Apply client-side filtering based on search params
  const searchQuery = params.search?.toLowerCase() || ''
  const filterType = params.filter || 'all'

  const filteredMembers = allMembers.filter(member => {
    // Apply search filter
    if (searchQuery) {
      const displayName =
        member.firstName && member.lastName
          ? `${member.firstName} ${member.lastName}`.toLowerCase()
          : (member.firstName || member.lastName || member.username || '').toLowerCase()
      const username = (
        member.username ||
        member.publicMetadata?.github_username ||
        ''
      ).toLowerCase()

      if (!displayName.includes(searchQuery) && !username.includes(searchQuery)) {
        return false
      }
    }

    // Apply filter type
    if (filterType === 'contributors') {
      return member.hasContributions === true
    } else if (filterType === 'community') {
      return member.hasContributions === false || member.hasContributions === undefined
    }

    return true // 'all' filter
  })

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">Community Members</h1>
        <p className="text-muted-foreground">
          {searchQuery || filterType !== 'all'
            ? `${filteredMembers.length} of ${allMembers.length} members`
            : `${allMembers.length} members and growing`}
        </p>
      </div>

      {/* Client-side search and filters */}
      <MembersSearch />

      {/* Static member grid with progressive enhancement */}
      <div className="mt-8 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-4">
        {filteredMembers.length === 0 ? (
          <div className="col-span-full text-center py-12">
            <p className="text-muted-foreground">
              {searchQuery
                ? `No members found matching "${params.search}"`
                : `No ${filterType === 'contributors' ? 'contributors' : 'community members'} found`}
            </p>
          </div>
        ) : (
          filteredMembers.map(member => {
            const userSlug = generateSlugFromUser(member)
            const displayName =
              member.firstName && member.lastName
                ? `${member.firstName} ${member.lastName}`
                : member.firstName ||
                  member.lastName ||
                  member.username ||
                  `User ${member.id.slice(-6).toUpperCase()}`
            const username = member.username || member.publicMetadata?.github_username
            const badge = getMemberBadgeSync(member.hasContributions)

            // Parse the date - it might be a timestamp number as string or ISO string
            let joinDate = 'Member'
            if (member.createdAt) {
              // Try parsing as number first (timestamp)
              const timestamp = Number(member.createdAt)
              const date = !Number.isNaN(timestamp)
                ? new Date(timestamp)
                : new Date(member.createdAt)

              if (!Number.isNaN(date.getTime())) {
                joinDate = date.toLocaleDateString('en-US', {
                  month: 'short',
                  year: 'numeric'
                })
              }
            }

            return (
              <Card
                key={member.id}
                className="transition-all hover:border-primary hover:bg-muted/50"
              >
                <CardContent className="p-2">
                  <Link href={`/u/${userSlug}`} className="block text-center space-y-1">
                    <Avatar className="w-14 h-14 sm:w-16 sm:h-16 mx-auto">
                      {member.imageUrl ? (
                        <AvatarImage
                          src={member.imageUrl}
                          alt={`${displayName}'s profile picture - llms.txt hub community member`}
                        />
                      ) : (
                        <AvatarFallback className="text-base sm:text-lg">
                          {displayName.charAt(0).toUpperCase()}
                        </AvatarFallback>
                      )}
                    </Avatar>

                    <div className="space-y-1">
                      <h3 className="font-semibold text-base truncate">{displayName}</h3>
                      {username && (
                        <p className="text-sm text-muted-foreground truncate">@{username}</p>
                      )}
                      <div className="flex items-center justify-center">
                        <Badge variant={badge.variant} className="text-xs px-1.5 py-0.5">
                          {badge.label}
                        </Badge>
                      </div>
                    </div>

                    <div className="flex items-center justify-center gap-1.5 text-sm text-muted-foreground">
                      <Calendar className="w-3.5 h-3.5" />
                      <span>{joinDate}</span>
                    </div>
                  </Link>
                </CardContent>
              </Card>
            )
          })
        )}
      </div>
    </div>
  )
}
