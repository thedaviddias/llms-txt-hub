'use client'

import { Button } from '@thedaviddias/design-system/button'
import { Github, Heart, Mail, Users } from 'lucide-react'
import Link from 'next/link'
import { Card } from '@/components/ui/card'

interface CommunityAnonymousPanelProps {
  favoritesCount: number
  totalMembers?: number
}

/**
 * Panel shown to anonymous users with favorites count and community join CTA
 */
export function CommunityAnonymousPanel({
  favoritesCount,
  totalMembers
}: CommunityAnonymousPanelProps) {
  return (
    <>
      {/* Anonymous user encouragement */}
      <Card className="p-6 text-center space-y-4">
        <div>
          <div className="mx-auto w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center mb-3">
            <Heart className="h-6 w-6 text-primary" />
          </div>
          <h3 className="font-semibold">Your Local Favorites</h3>
          <p className="text-sm text-muted-foreground">Saved on this device</p>
        </div>
        <div>
          <p className="text-3xl font-bold">{favoritesCount}</p>
          <p className="text-sm text-muted-foreground">Projects favorited</p>
        </div>
        <div className="pt-4 space-y-2">
          <Button asChild size="sm" className="w-full">
            <Link href="/login">
              <Mail className="h-4 w-4 mr-2" />
              Sign In to Save
            </Link>
          </Button>
          <p className="text-xs text-muted-foreground">Create account to sync your favorites</p>
        </div>
      </Card>

      {/* Community invitation */}
      <Card className="p-6 text-center space-y-4 bg-gradient-to-br from-primary/5 to-blue-500/5">
        <div>
          <div className="mx-auto w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center mb-3">
            <Users className="h-6 w-6 text-primary" />
          </div>
          <h3 className="font-semibold">Join Our Community</h3>
          <p className="text-sm text-muted-foreground">
            Connect with {totalMembers || '2,000+'} developers building AI-ready documentation
          </p>
        </div>
        <div className="space-y-2">
          <Button asChild size="sm" className="w-full">
            <Link href="/login">
              <Github className="h-4 w-4 mr-2" />
              Join with GitHub
            </Link>
          </Button>
          <Button asChild variant="outline" size="sm" className="w-full">
            <Link
              href="#"
              onClick={e => {
                e.preventDefault()
                window.open('https://substack.com', '_blank')
              }}
            >
              <Mail className="h-4 w-4 mr-2" />
              Newsletter
            </Link>
          </Button>
        </div>
      </Card>
    </>
  )
}
