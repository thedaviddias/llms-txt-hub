'use client'
import { GithubStars } from '@/components/stats/github-stars'
import { useSearch } from '@/hooks/use-search'
import { getRoute } from '@/lib/routes'
import { Search } from 'lucide-react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useState } from 'react'

interface NavLinkProps {
  href: string
  children: React.ReactNode
  exact?: boolean
}

function NavLink({ href, children, exact = false }: NavLinkProps) {
  const pathname = usePathname()
  const isActive = exact ? pathname === href : pathname.startsWith(href)

  return (
    <Link
      href={href}
      className={`text-sm transition-colors ${
        isActive ? 'text-foreground font-medium' : 'text-muted-foreground hover:text-foreground'
      }`}
    >
      {children}
    </Link>
  )
}

export function Header() {
  const [showMobileSearch, setShowMobileSearch] = useState(false)
  const { searchQuery, setSearchQuery, handleSearch } = useSearch()

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (searchQuery.trim()) {
      handleSearch(searchQuery)
      setSearchQuery('')
    }
  }

  return (
    <header className="border-b">
      <div className="container mx-auto px-4 h-16 flex items-center justify-between">
        <div className="flex items-center gap-6">
          <Link href={getRoute('home')} className="font-medium">
            llms.txt hub
          </Link>
          <nav className="hidden md:flex items-center gap-4">
            <NavLink href={getRoute('website.list')}>Websites</NavLink>
            <NavLink href={getRoute('guides.list')}>Guides</NavLink>
            <NavLink href={getRoute('projects')}>Projects</NavLink>
            <NavLink href={getRoute('blog')}>Blog</NavLink>
            <NavLink href={getRoute('news')}>News</NavLink>
          </nav>
        </div>

        <div className="flex items-center gap-3">
          {/* Search Bar */}
          <form onSubmit={onSubmit} className="hidden md:block relative">
            <input
              type="text"
              placeholder="Search..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="w-full rounded-md border border-input bg-background px-3 py-1.5 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
            />
            <button
              type="submit"
              className="absolute inset-y-0 right-0 flex items-center px-2 text-muted-foreground"
              aria-label="Search"
            >
              <Search className="h-4 w-4" />
            </button>
          </form>
          {/* Mobile search icon */}
          <button
            type="button"
            className="md:hidden text-muted-foreground"
            onClick={() => setShowMobileSearch(!showMobileSearch)}
            aria-label="Toggle search"
          >
            <Search className="h-5 w-5" />
          </button>

          <GithubStars />
          <Link
            href={getRoute('submit')}
            className="inline-flex justify-center rounded-lg text-sm font-semibold py-1.5 px-3 text-slate-900 bg-slate-900 dark:bg-white text-white dark:text-slate-900"
          >
            <span className="hidden md:inline">Submit llms.txt</span>
            <span className="md:hidden">Submit</span>
          </Link>
        </div>
      </div>

      {/* Mobile search bar (shown when toggle is clicked) */}
      {showMobileSearch && (
        <div className="md:hidden container mx-auto px-4 py-2 border-t">
          <form onSubmit={onSubmit} className="relative">
            <input
              type="text"
              placeholder="Search..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="w-full rounded-md border border-input bg-background px-3 py-1.5 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
            />
            <button
              type="submit"
              className="absolute inset-y-0 right-0 flex items-center px-2 text-muted-foreground"
              aria-label="Search"
            >
              <Search className="h-4 w-4" />
            </button>
          </form>
        </div>
      )}
    </header>
  )
}
