import { Avatar, AvatarFallback, AvatarImage } from '@thedaviddias/design-system/avatar'
import { Card, CardContent } from '@thedaviddias/design-system/card'
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
    isProfilePrivate?: boolean
  }
}

interface MemberCardProps {
  member: Member
  children?: React.ReactNode
}

function generateSlugFromUser(user: Member): string {
  if (!user) return ''
  const username = user.username || user.publicMetadata?.github_username
  if (!username) return user.id
  return username
}

export function MemberCard({ member, children }: MemberCardProps) {
  const displayName =
    member.firstName && member.lastName
      ? `${member.firstName} ${member.lastName}`
      : member.firstName || member.lastName || 'Anonymous'
  const username = member.username || member.publicMetadata?.github_username
  const slug = generateSlugFromUser(member)
  const joinedDate = new Date(member.createdAt)

  return (
    <Link href={`/u/${slug}`} className="group block">
      <Card className="overflow-hidden transition-all hover:shadow-lg hover:-translate-y-1">
        <CardContent className="p-6">
          <div className="flex items-start justify-between">
            <div className="flex items-center space-x-4">
              <Avatar className="h-12 w-12 border-2 border-muted">
                <AvatarImage src={member.imageUrl || ''} alt={displayName} />
                <AvatarFallback>
                  {displayName
                    .split(' ')
                    .map(n => n[0])
                    .join('')
                    .toUpperCase()}
                </AvatarFallback>
              </Avatar>
              <div className="space-y-1">
                <h3 className="font-semibold text-sm leading-tight group-hover:text-primary transition-colors">
                  {displayName}
                </h3>
                {username && <p className="text-xs text-muted-foreground">@{username}</p>}
                <div className="flex items-center gap-1 text-xs text-muted-foreground">
                  <Calendar className="h-3 w-3" />
                  <span>Joined {joinedDate.toLocaleDateString()}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Badges */}
          {children && (
            <div className="mt-3 flex flex-wrap gap-1">
              {/* Additional badges (like contribution badge) can be added via children */}
              {children}
            </div>
          )}
        </CardContent>
      </Card>
    </Link>
  )
}
