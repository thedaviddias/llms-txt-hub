import { Section } from '@/components/layout/section'
import { Card, CardContent } from '@/components/ui/card'
import { getMemberBadgeSync } from '@/lib/member-client-utils'
import { getRoute } from '@/lib/routes'
import { Avatar, AvatarFallback, AvatarImage } from '@thedaviddias/design-system/avatar'
import { Badge } from '@thedaviddias/design-system/badge'
import { Calendar } from 'lucide-react'
import Link from 'next/link'

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

interface LatestMembersSectionProps {
  members: Member[]
}

function generateSlugFromUser(user: Member): string {
  if (!user) return ''
  const username = user.username || user.publicMetadata?.github_username
  // Use full user ID for email-only users (Clerk IDs start with 'user_')
  if (!username) return user.id
  return username
}

export function LatestMembersSection({ members }: LatestMembersSectionProps) {
  if (!members || members.length === 0) {
    return null
  }

  return (
    <Section
      title="Latest Members"
      description="Welcome our newest community members who joined llms.txt hub"
      viewAllHref={getRoute('members.list')}
      viewAllText="All members"
    >
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-4">
        {members.map(user => {
          const userSlug = generateSlugFromUser(user)
          const displayName =
            user.firstName && user.lastName
              ? `${user.firstName} ${user.lastName}`
              : user.firstName ||
                user.lastName ||
                user.username ||
                `User ${user.id.slice(-6).toUpperCase()}`
          const username = user.username || user.publicMetadata?.github_username
          const badge = getMemberBadgeSync(user.hasContributions)

          // Parse the date - it might be a timestamp number as string or ISO string
          let joinDate = 'Member'
          if (user.createdAt) {
            // Try parsing as number first (timestamp)
            const timestamp = Number(user.createdAt)
            const date = !Number.isNaN(timestamp) ? new Date(timestamp) : new Date(user.createdAt)

            if (!Number.isNaN(date.getTime())) {
              joinDate = date.toLocaleDateString('en-US', {
                month: 'short',
                year: 'numeric'
              })
            }
          }

          return (
            <Card key={user.id} className="transition-all hover:border-primary hover:bg-muted/50">
              <CardContent className="p-2">
                <Link href={`/u/${userSlug}`} className="block text-center space-y-1">
                  <Avatar className="w-14 h-14 sm:w-16 sm:h-16 mx-auto">
                    {user.imageUrl ? (
                      <AvatarImage
                        src={user.imageUrl}
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
        })}
      </div>
    </Section>
  )
}
