'use client'
import { GithubStars } from '@/components/stats/github-stars'
import { getRoute } from '@/lib/routes'
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
              href={getRoute('website.list')}
              className="text-sm text-muted-foreground hover:text-foreground"
            >
              Websites
            </Link>
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
          <Link
            href={getRoute('submit')}
            className="inline-flex justify-center rounded-lg text-sm font-semibold py-2 px-3 text-slate-900 bg-slate-900 dark:bg-white text-white dark:text-slate-900"
          >
            Submit llms.txt
          </Link>
        </div>
      </div>
    </header>
  )
}
