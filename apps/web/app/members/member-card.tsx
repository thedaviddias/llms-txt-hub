import { Avatar, AvatarFallback, AvatarImage } from '@thedaviddias/design-system/avatar'
import { Badge } from '@thedaviddias/design-system/badge'
import { Calendar } from 'lucide-react'
import Link from 'next/link'
import { Card, CardContent } from '@/components/ui/card'
import { getMemberBadgeSync } from '@/lib/member-client-utils'
import type { Member } from '@/lib/member-server-utils'

interface MemberCardProps {
  member: Member
  userSlug: string
  displayName: string
}

/**
 * Individual member card component
 * Displays member information in a card format
 */
export function MemberCard({ member, userSlug, displayName }: MemberCardProps) {
  const username = member.username || member.publicMetadata?.github_username
  const badge = getMemberBadgeSync(member.hasContributions)

  // Parse the date - it might be a timestamp number as string or ISO string
  let joinDate = 'Member'
  if (member.createdAt) {
    // Try parsing as number first (timestamp)
    const timestamp = Number(member.createdAt)
    const date = !Number.isNaN(timestamp) ? new Date(timestamp) : new Date(member.createdAt)

    if (!Number.isNaN(date.getTime())) {
      joinDate = date.toLocaleDateString('en-US', {
        month: 'short',
        year: 'numeric'
      })
    }
  }

  return (
    <Card className="transition-all hover:border-primary hover:bg-muted/50">
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
            {username && <p className="text-sm text-muted-foreground truncate">@{username}</p>}
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
}
