'use client'

import { Card, CardContent } from '@/components/ui/card'
import { getMemberBadgeSync } from '@/lib/member-client-utils'
import { Avatar, AvatarFallback, AvatarImage } from '@thedaviddias/design-system/avatar'
import { Badge } from '@thedaviddias/design-system/badge'
import { Calendar, Star } from 'lucide-react'
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

interface MemberCardItemProps {
  member: Member
  userSlug: string
  onClick?: () => void
}

/**
 * Individual member card component displaying user info and contribution badge
 * @param props - Component props
 * @param props.member - Member data to display
 * @param props.userSlug - URL slug for user profile link
 * @returns JSX component for single member card
 */
export function MemberCardItem({ member, userSlug, onClick }: MemberCardItemProps) {
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
      <CardContent className="p-4">
        <Link href={`/u/${userSlug}`} onClick={onClick} className="block text-center space-y-3">
          <Avatar className="w-16 h-16 mx-auto">
            {member.imageUrl ? (
              <AvatarImage
                src={member.imageUrl}
                alt={`${displayName}'s profile picture - llms.txt hub community member`}
              />
            ) : (
              <AvatarFallback className="text-lg">
                {displayName.charAt(0).toUpperCase()}
              </AvatarFallback>
            )}
          </Avatar>

          <div className="space-y-2">
            <h3 className="font-semibold text-base truncate">{displayName}</h3>
            {username && <p className="text-sm text-muted-foreground truncate">@{username}</p>}

            {/* Badge */}
            <div className="flex flex-wrap gap-1 justify-center">
              <Badge variant={badge.variant} className="text-xs">
                {badge.label}
              </Badge>
              {member.hasContributions && (
                <Badge variant="secondary" className="text-xs">
                  <Star className="mr-1 h-3 w-3" />
                  Contributor
                </Badge>
              )}
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
