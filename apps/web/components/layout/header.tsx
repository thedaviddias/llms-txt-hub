'use client'
import { useAnalyticsEvents } from '@/components/analytics-tracker'
import { GithubStars } from '@/components/stats/github-stars'
import { useSearch } from '@/hooks/use-search'
import { getRoute } from '@/lib/routes'
import { useAuth } from '@thedaviddias/auth'
import { Menu, Search, UserPlus } from 'lucide-react'
import Link from 'next/link'
import { useEffect, useState } from 'react'
import { NavLink } from './header-nav-link'
import { DesktopSearchForm, MobileSearchOverlay } from './header-search'
import { UserDropdownMenu } from './header-user-menu'
import { MobileDrawer } from './mobile-drawer'

/**
 * Generates a user slug from user data
 *
 * @param user - User object from auth
 * @returns string - Generated user slug
 */
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

/**
 * Main header component with navigation, search, and user actions
 *
 * @returns JSX.Element - Header component
 */
export function Header() {
  const [showMobileSearch, setShowMobileSearch] = useState(false)
  const [showMobileDrawer, setShowMobileDrawer] = useState(false)
  const [showAutocomplete, setShowAutocomplete] = useState(false)
  const [showMobileAutocomplete, setShowMobileAutocomplete] = useState(false)
  const { searchQuery, setSearchQuery, handleSearch } = useSearch()
  const { user, signOut } = useAuth()
  const { trackSearch } = useAnalyticsEvents()

  const userSlug = user ? generateSlugFromUser(user) : ''
  const isProfilePrivate = Boolean(user?.publicMetadata?.isProfilePrivate)

  // Check if profile is incomplete (needs name or username to be visible)
  const needsNameOrUsername = Boolean(
    user &&
      !user.user_metadata?.full_name &&
      !user.user_metadata?.user_name &&
      !user.publicMetadata?.github_username
  )

  // Auto-focus mobile search input when it appears and handle escape key
  useEffect(() => {
    if (showMobileSearch) {
      // Prevent body scroll when search is open
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = ''
    }

    return () => {
      document.body.style.overflow = ''
    }
  }, [showMobileSearch])

  /**
   * Handles form submission for search
   *
   * @param e - Form event
   */
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
      if (showMobileSearch) {
        setShowMobileSearch(false)
        setShowMobileAutocomplete(false)
      }
    }
  }

  /**
   * Handles desktop search input focus
   */
  const handleInputFocus = () => {
    setShowAutocomplete(true)
  }

  /**
   * Handles mobile search input focus
   */
  const handleMobileInputFocus = () => {
    setShowMobileAutocomplete(true)
  }

  /**
   * Handles desktop search input change
   *
   * @param e - Input change event
   */
  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchQuery(e.target.value)
    if (!showAutocomplete) setShowAutocomplete(true)
  }

  /**
   * Handles mobile search input change
   *
   * @param e - Input change event
   */
  const handleMobileSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchQuery(e.target.value)
    if (!showMobileAutocomplete) setShowMobileAutocomplete(true)
  }

  return (
    <>
      <header className="sticky top-0 z-50 bg-background border-b">
        <div className="w-full px-4 sm:px-6 h-16 flex 2xl:grid 2xl:grid-cols-3 items-center justify-between 2xl:justify-center gap-3 sm:gap-4">
          {/* Logo + Menu - Left */}
          <div className="flex items-center gap-2">
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
              className="text-lg font-semibold whitespace-nowrap plausible-event-name=External+Link+Click"
            >
              <span className="inline">llms.txt</span>
              <span className="inline ml-1">hub</span>
            </Link>
          </div>

          {/* Search - Center (prominent on desktop) */}
          <DesktopSearchForm
            searchQuery={searchQuery}
            onSearchChange={handleSearchChange}
            onInputFocus={handleInputFocus}
            onSubmit={onSubmit}
            showAutocomplete={showAutocomplete}
            onAutocompleteClose={() => setShowAutocomplete(false)}
            onAutocompleteSelect={() => {
              setShowAutocomplete(false)
              setSearchQuery('')
            }}
          />

          {/* Navigation + Actions - Right */}
          <div className="flex items-center gap-2 sm:gap-4 2xl:justify-end">
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
              <UserDropdownMenu
                user={user}
                userSlug={userSlug}
                isProfilePrivate={isProfilePrivate}
                needsNameOrUsername={needsNameOrUsername}
                onSignOut={signOut}
              />
            ) : (
              <Link
                href="/login"
                className="inline-flex items-center justify-center rounded-lg text-sm font-medium py-1.5 px-3 bg-primary text-primary-foreground hover:bg-primary/90 transition-colors plausible-event-name=Login"
                aria-label="Sign up"
                title="Sign up"
              >
                <UserPlus className="h-4 w-4 sm:hidden" />
                <span className="hidden sm:inline">Sign Up</span>
              </Link>
            )}
          </div>
        </div>

        {/* Mobile search overlay */}
        <MobileSearchOverlay
          showMobileSearch={showMobileSearch}
          searchQuery={searchQuery}
          onSearchChange={handleMobileSearchChange}
          onInputFocus={handleMobileInputFocus}
          onSubmit={onSubmit}
          showMobileAutocomplete={showMobileAutocomplete}
          onMobileSearchClose={() => {
            setShowMobileSearch(false)
            setShowMobileAutocomplete(false)
          }}
          onAutocompleteSelect={() => {
            setShowMobileAutocomplete(false)
            setShowMobileSearch(false)
            setSearchQuery('')
          }}
        />
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
