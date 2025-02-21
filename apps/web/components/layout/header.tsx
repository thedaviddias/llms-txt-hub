'use client'

import { ModeToggle } from '@/components/mode-toggle'
import { SearchBar } from '@/components/search/search-bar'
import { Button } from '@thedaviddias/design-system/button'
import { Search, X } from 'lucide-react'
import Link from 'next/link'
import { useState } from 'react'

export function Header() {
  const [showMobileSearch, setShowMobileSearch] = useState(false)

  return (
    <header className="border-b">
      <div className="container mx-auto px-4 h-16 flex items-center justify-between">
        <div className="flex items-center gap-6">
          <Link href="/" className="font-medium">
            llms.txt hub
          </Link>
          <nav className="hidden md:flex items-center gap-4">
            <Link href="/blog" className="text-sm text-muted-foreground hover:text-foreground">
              Blog
            </Link>
            <Link href="/resources" className="text-sm text-muted-foreground hover:text-foreground">
              Resources
            </Link>
          </nav>
        </div>
        <div className="flex items-center gap-4">
          <div className="hidden md:block w-[280px]">
            <SearchBar placeholder="Search by name, category, or token count..." className="h-9" />
          </div>
          <Button
            variant="ghost"
            size="icon"
            className="md:hidden"
            onClick={() => setShowMobileSearch(!showMobileSearch)}
          >
            {showMobileSearch ? <X className="h-5 w-5" /> : <Search className="h-5 w-5" />}
          </Button>
          <Button variant="default" size="sm" asChild>
            <Link href="/submit">Submit llms.txt</Link>
          </Button>
          <ModeToggle />
        </div>
      </div>
      {showMobileSearch && (
        <div className="md:hidden px-4 py-2 border-t">
          <SearchBar placeholder="Search llms.txt hub..." />
        </div>
      )}
    </header>
  )
}
