'use client'
import { useAuth } from '@thedaviddias/auth'
import { Avatar, AvatarFallback, AvatarImage } from '@thedaviddias/design-system/avatar'
import { Badge } from '@thedaviddias/design-system/badge'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger
} from '@thedaviddias/design-system/dropdown-menu'
import { Eye, EyeOff, LogOut, Menu, Plus, Search, Settings, User } from 'lucide-react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useEffect, useRef, useState } from 'react'
import { useAnalyticsEvents } from '@/components/analytics-tracker'
import { AuthTierIndicator } from '@/components/auth/auth-tier-indicator'
import { SearchAutocomplete } from '@/components/search/search-autocomplete'
import { GithubStars } from '@/components/stats/github-stars'
import { useSearch } from '@/hooks/use-search'
import { getRoute } from '@/lib/routes'
import { MobileDrawer } from './mobile-drawer'

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
      className={`text-[15px] transition-colors ${
        isActive ? 'text-foreground font-medium' : 'text-muted-foreground hover:text-foreground'
      } plausible-event-name=External+Link+Click`}
    >
      {children}
    </Link>
  )
}

function generateSlugFromUser(user: any): string {
  if (!user) return ''

  // Try to get username from user_metadata
  const username = user.user_metadata?.user_name
  if (username) {
    return username
  }

  // Fallback to user ID if no username available
  return user.id
}

export function Header() {
  const [showMobileSearch, setShowMobileSearch] = useState(false)
  const [showMobileDrawer, setShowMobileDrawer] = useState(false)
  const [showAutocomplete, setShowAutocomplete] = useState(false)
  const [showMobileAutocomplete, setShowMobileAutocomplete] = useState(false)
  const { searchQuery, setSearchQuery, handleSearch } = useSearch()
  const { user, signOut } = useAuth()
  const { trackSearch } = useAnalyticsEvents()
  const searchInputRef = useRef<HTMLInputElement>(null)
  const mobileSearchInputRef = useRef<HTMLInputElement>(null)

  const userSlug = user ? generateSlugFromUser(user) : ''
  const isProfilePrivate = user?.publicMetadata?.isProfilePrivate === true

  // Check if profile is incomplete (needs name or username to be visible)
  const needsNameOrUsername =
    user &&
    !user.user_metadata?.full_name &&
    !user.user_metadata?.user_name &&
    !user.publicMetadata?.github_username

  // Auto-focus mobile search input when it appears and handle escape key
  useEffect(() => {
    if (showMobileSearch && mobileSearchInputRef.current) {
      setTimeout(() => {
        mobileSearchInputRef.current?.focus()
      }, 100)
    }

    // Handle escape key to close mobile search
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && showMobileSearch) {
        setShowMobileSearch(false)
        setShowMobileAutocomplete(false)
      }
    }

    if (showMobileSearch) {
      document.addEventListener('keydown', handleEscape)
      // Prevent body scroll when search is open
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = ''
    }

    return () => {
      document.removeEventListener('keydown', handleEscape)
      document.body.style.overflow = ''
    }
  }, [showMobileSearch])

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (searchQuery.trim()) {
      // Track search submission
      trackSearch(
        searchQuery,
        0,
        showMobileSearch ? 'header-mobile-search' : 'header-desktop-search'
      )
      handleSearch(searchQuery)
      setSearchQuery('')
      setShowAutocomplete(false)
      setShowMobileAutocomplete(false)
    }
  }

  const handleInputFocus = () => {
    setShowAutocomplete(true)
  }

  const handleMobileInputFocus = () => {
    setShowMobileAutocomplete(true)
  }

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchQuery(e.target.value)
    if (!showAutocomplete) setShowAutocomplete(true)
  }

  const handleMobileSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchQuery(e.target.value)
    if (!showMobileAutocomplete) setShowMobileAutocomplete(true)
  }

  return (
    <>
      <header className="sticky top-0 z-50 bg-background border-b">
        <div className="w-full px-6 h-16 flex 2xl:grid 2xl:grid-cols-3 items-center justify-between 2xl:justify-center gap-4">
          {/* Logo + Menu - Left */}
          <div className="flex items-center gap-3">
            {/* Mobile menu toggle */}
            <button
              type="button"
              onClick={() => setShowMobileDrawer(true)}
              className="block sm:hidden p-2 hover:bg-muted rounded-md transition-colors -ml-2"
              aria-label="Open menu"
            >
              <Menu className="h-5 w-5" />
            </button>
            <Link
              href={getRoute('home')}
              className="text-lg font-semibold plausible-event-name=External+Link+Click"
            >
              llms.txt hub
            </Link>
          </div>

          {/* Search - Center (prominent on desktop) */}
          <div className="hidden md:block flex-1 2xl:flex-none 2xl:w-full max-w-2xl 2xl:max-w-none">
            <form onSubmit={onSubmit} className="relative 2xl:max-w-2xl 2xl:mx-auto">
              <input
                ref={searchInputRef}
                type="text"
                placeholder="Search websites, tools, and platforms..."
                value={searchQuery}
                onChange={handleSearchChange}
                onFocus={handleInputFocus}
                className="w-full rounded-lg border border-input bg-background px-4 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
              />
              <button
                type="submit"
                className="absolute inset-y-0 right-0 flex items-center px-3 text-muted-foreground hover:text-foreground"
                aria-label="Search"
              >
                <Search className="h-4 w-4" />
              </button>
              <SearchAutocomplete
                searchQuery={searchQuery}
                isOpen={showAutocomplete}
                onClose={() => setShowAutocomplete(false)}
                anchorRef={searchInputRef}
                onSelect={() => {
                  setShowAutocomplete(false)
                  setSearchQuery('')
                }}
              />
            </form>
          </div>

          {/* Navigation + Actions - Right */}
          <div className="flex items-center gap-4 2xl:justify-end">
            {/* Desktop navigation */}
            <nav className="hidden lg:flex items-center gap-4">
              <NavLink href={getRoute('projects')}>Projects</NavLink>
              <NavLink href={getRoute('guides.list')}>Guides</NavLink>
              <NavLink href={getRoute('members.list')}>Members</NavLink>
              <NavLink href={getRoute('news')}>News</NavLink>
            </nav>

            {/* Mobile search icon */}
            <button
              type="button"
              className="md:hidden text-muted-foreground hover:text-foreground"
              onClick={() => setShowMobileSearch(!showMobileSearch)}
              aria-label="Toggle search"
            >
              <Search className="h-5 w-5" />
            </button>

            <div>
              <GithubStars mobileCompact={true} />
            </div>

            {user ? (
              <DropdownMenu>
                <DropdownMenuTrigger className="focus:outline-none">
                  <Avatar className="cursor-pointer h-8 w-8 rounded-full">
                    {user.user_metadata?.avatar_url ? (
                      <AvatarImage
                        src={user.user_metadata.avatar_url}
                        alt={user.name || 'User avatar'}
                      />
                    ) : (
                      <AvatarFallback>
                        {user.name ? user.name.charAt(0).toUpperCase() : 'U'}
                      </AvatarFallback>
                    )}
                  </Avatar>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-64">
                  {/* User Info Section */}
                  <div className="px-3 py-3">
                    <div className="flex flex-col space-y-1 leading-none">
                      {user.name && <p className="font-medium truncate">{user.name}</p>}
                      {user.email && (
                        <p className="text-xs text-muted-foreground truncate">{user.email}</p>
                      )}
                      <div className="pt-2">
                        <AuthTierIndicator compact={true} showUpgrade={false} />
                      </div>
                    </div>
                  </div>

                  <DropdownMenuSeparator />
                  {/* Navigation Items */}
                  <div className="py-1">
                    <DropdownMenuItem asChild className="p-0">
                      <Link
                        href={`/u/${userSlug}`}
                        className="flex w-full items-center px-3 py-2.5 text-sm hover:bg-accent hover:text-accent-foreground transition-colors duration-150 cursor-pointer plausible-event-name=Member+Profile+Click"
                      >
                        <User className="mr-3 h-4 w-4" />
                        <span className="cursor-pointer">Profile</span>
                        <Badge
                          variant="outline"
                          className={`ml-auto text-xs ${
                            needsNameOrUsername
                              ? 'bg-red-50 text-red-700 border-red-200'
                              : isProfilePrivate
                                ? 'bg-orange-50 text-orange-700 border-orange-200'
                                : 'bg-blue-50 text-blue-700 border-blue-200'
                          }`}
                        >
                          {needsNameOrUsername ? (
                            <>
                              <EyeOff className="w-3 h-3 mr-1" />
                              Hidden
                            </>
                          ) : isProfilePrivate ? (
                            <>
                              <EyeOff className="w-3 h-3 mr-1" />
                              Private
                            </>
                          ) : (
                            <>
                              <Eye className="w-3 h-3 mr-1" />
                              Public
                            </>
                          )}
                        </Badge>
                      </Link>
                    </DropdownMenuItem>
                    <DropdownMenuItem asChild className="p-0">
                      <Link
                        href={getRoute('submit')}
                        className="flex w-full items-center px-3 py-2.5 text-sm hover:bg-accent hover:text-accent-foreground transition-colors duration-150 cursor-pointer plausible-event-name=Submit+Project"
                      >
                        <Plus className="mr-3 h-4 w-4" />
                        <span className="cursor-pointer">Add Your your llms.txt</span>
                      </Link>
                    </DropdownMenuItem>
                    <DropdownMenuItem asChild className="p-0">
                      <Link
                        href="/settings"
                        className="flex w-full items-center px-3 py-2.5 text-sm hover:bg-accent hover:text-accent-foreground transition-colors duration-150 cursor-pointer plausible-event-name=Settings"
                      >
                        <Settings className="mr-3 h-4 w-4" />
                        <span className="cursor-pointer">Settings</span>
                      </Link>
                    </DropdownMenuItem>
                  </div>

                  <div className="h-px bg-border mx-2" />

                  {/* Danger Zone */}
                  <div className="py-1">
                    <DropdownMenuItem
                      onClick={() => signOut()}
                      className="text-destructive focus:text-destructive focus:bg-destructive/20 hover:bg-destructive/20 hover:text-destructive mx-2 my-1 px-3 py-2.5 text-sm transition-colors duration-150 cursor-pointer"
                    >
                      <LogOut className="mr-3 h-4 w-4" />
                      <span>Log out</span>
                    </DropdownMenuItem>
                  </div>
                </DropdownMenuContent>
              </DropdownMenu>
            ) : (
              <Link
                href="/login"
                className="inline-flex items-center justify-center rounded-lg text-sm font-medium py-1.5 px-3 bg-primary text-primary-foreground hover:bg-primary/90 transition-colors plausible-event-name=Login"
              >
                <span className="hidden md:inline">Sign Up</span>
                <span className="md:hidden">Sign Up</span>
              </Link>
            )}
          </div>
        </div>

        {/* Mobile search overlay (shown when toggle is clicked) */}
        {showMobileSearch && (
          <>
            {/* Backdrop */}
            <button
              type="button"
              className="md:hidden fixed inset-0 top-16 z-40 bg-black/50 backdrop-blur-sm"
              onClick={() => {
                setShowMobileSearch(false)
                setShowMobileAutocomplete(false)
              }}
              aria-label="Close search"
            />
            {/* Search container */}
            <div className="md:hidden fixed inset-x-0 top-16 z-50 bg-background">
              <div className="px-4 py-3 border-t">
                <form onSubmit={onSubmit} className="relative">
                  <input
                    ref={mobileSearchInputRef}
                    type="text"
                    placeholder="Search AI documentation and tools..."
                    value={searchQuery}
                    onChange={handleMobileSearchChange}
                    onFocus={handleMobileInputFocus}
                    className="w-full rounded-lg border border-input bg-background px-4 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                  />
                  <button
                    type="submit"
                    className="absolute inset-y-0 right-0 flex items-center px-3 text-muted-foreground hover:text-foreground"
                    aria-label="Search"
                  >
                    <Search className="h-4 w-4" />
                  </button>
                  <SearchAutocomplete
                    searchQuery={searchQuery}
                    isOpen={showMobileAutocomplete}
                    onClose={() => setShowMobileAutocomplete(false)}
                    anchorRef={mobileSearchInputRef}
                    onSelect={() => {
                      setShowMobileAutocomplete(false)
                      setShowMobileSearch(false)
                      setSearchQuery('')
                    }}
                  />
                </form>
              </div>
            </div>
          </>
        )}
      </header>

      {/* Mobile Drawer */}
      <MobileDrawer
        isOpen={showMobileDrawer}
        onClose={() => setShowMobileDrawer(false)}
        featuredCount={6}
      />
    </>
  )
}
