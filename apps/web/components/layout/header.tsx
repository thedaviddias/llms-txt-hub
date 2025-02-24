'use client'

import { ModeToggle } from '@/components/mode-toggle'
import { GithubStars } from '@/components/stats/github-stars'
import { getRoute } from '@/lib/routes'
import { Button } from '@thedaviddias/design-system/button'
import Link from 'next/link'
import { useState } from 'react'

export function Header() {
  const [showMobileSearch, setShowMobileSearch] = useState(false)

  return (
    <header className="border-b">
      <div className="container mx-auto px-4 h-16 flex items-center justify-between">
        <div className="flex items-center gap-6">
          <Link href={getRoute('home')} className="font-medium">
            llms.txt hub
          </Link>
          <nav className="hidden md:flex items-center gap-4">
            <Link
              href={getRoute('resources')}
              className="text-sm text-muted-foreground hover:text-foreground"
            >
              Resources
            </Link>
            <Link
              href={getRoute('blog')}
              className="text-sm text-muted-foreground hover:text-foreground"
            >
              Blog
            </Link>
            <Link
              href={getRoute('news')}
              className="text-sm text-muted-foreground hover:text-foreground"
            >
              News
            </Link>
          </nav>
        </div>
        <div className="flex items-center gap-4">
          <GithubStars />
          <Button variant="default" size="sm" asChild>
            <Link href={getRoute('submit')}>Submit llms.txt</Link>
          </Button>
          <ModeToggle />
        </div>
      </div>
    </header>
  )
}
