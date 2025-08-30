'use client'

import { cn } from '@thedaviddias/design-system/lib/utils'
import { ExternalLink, Home as HomeIcon, Trophy, X } from 'lucide-react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useEffect } from 'react'
import { FavoritesLink } from '@/components/ui/favorites-link'
import { categories } from '@/lib/categories'
import { getRoute } from '@/lib/routes'
import { tools } from '@/lib/tools'

interface MobileDrawerProps {
  isOpen: boolean
  onClose: () => void
  featuredCount?: number
}

/**
 * Mobile navigation drawer component
 */
export function MobileDrawer({ isOpen, onClose, featuredCount }: MobileDrawerProps) {
  const pathname = usePathname()

  // Close drawer when route changes
  useEffect(() => {
    if (isOpen) {
      onClose()
    }
  }, [pathname]) // eslint-disable-line react-hooks/exhaustive-deps

  // Prevent body scroll when drawer is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = ''
    }

    return () => {
      document.body.style.overflow = ''
    }
  }, [isOpen])

  // Handle escape key
  useEffect(() => {
    /**
     * Handles escape key press
     */
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose()
      }
    }

    document.addEventListener('keydown', handleEscape)
    return () => document.removeEventListener('keydown', handleEscape)
  }, [isOpen, onClose])

  const isHomePage = pathname === '/'
  /**
   * Checks if current page is a category page
   */
  const isCategoryPage = (slug: string) => pathname === `/category/${slug}`

  return (
    <>
      {/* Backdrop */}
      <button
        type="button"
        className={cn(
          'fixed inset-0 bg-black/50 backdrop-blur-sm z-[60] transition-opacity sm:hidden border-none p-0',
          isOpen ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'
        )}
        onClick={onClose}
        onKeyDown={e => {
          if (e.key === 'Escape') {
            onClose()
          }
        }}
        tabIndex={isOpen ? 0 : -1}
        aria-label="Close menu"
        aria-hidden="true"
      />

      {/* Drawer */}
      <div
        className={cn(
          'fixed top-0 left-0 h-full w-[280px] bg-background border-r z-[70] transition-transform duration-300 sm:hidden',
          isOpen ? 'translate-x-0' : '-translate-x-full'
        )}
      >
        {/* Drawer Header */}
        <div className="flex items-center justify-between p-4 border-b">
          <h2 className="font-semibold text-lg">Menu</h2>
          <button
            type="button"
            onClick={onClose}
            className="p-2 hover:bg-muted rounded-md transition-colors"
            aria-label="Close menu"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Drawer Content */}
        <div className="overflow-y-auto h-[calc(100%-64px)] p-4 space-y-6">
          {/* Main Navigation */}
          <div>
            <h3 className="font-semibold text-sm mb-3 text-muted-foreground">Navigation</h3>
            <nav className="space-y-1">
              <Link
                href={getRoute('projects')}
                className="flex items-center gap-2 px-2 py-1.5 text-sm text-muted-foreground hover:text-foreground hover:bg-muted/50 rounded-md transition-colors"
              >
                Projects
              </Link>
              <Link
                href={getRoute('guides.list')}
                className="flex items-center gap-2 px-2 py-1.5 text-sm text-muted-foreground hover:text-foreground hover:bg-muted/50 rounded-md transition-colors"
              >
                Guides
              </Link>
              <Link
                href={getRoute('members.list')}
                className="flex items-center gap-2 px-2 py-1.5 text-sm text-muted-foreground hover:text-foreground hover:bg-muted/50 rounded-md transition-colors"
              >
                Members
              </Link>
              <Link
                href={getRoute('news')}
                className="flex items-center gap-2 px-2 py-1.5 text-sm text-muted-foreground hover:text-foreground hover:bg-muted/50 rounded-md transition-colors"
              >
                News
              </Link>
            </nav>
          </div>

          {/* My Collection Section */}
          <div>
            <h3 className="font-semibold text-sm mb-3 text-muted-foreground">My Collection</h3>
            <nav className="space-y-1">
              <FavoritesLink isMobile />
            </nav>
          </div>

          {/* Categories */}
          <div>
            <h3 className="font-semibold text-sm mb-3 text-muted-foreground">Categories</h3>
            <nav className="space-y-1">
              <a
                href={isHomePage ? '#all-websites' : `${getRoute('home')}#all-websites`}
                onClick={e => {
                  if (isHomePage) {
                    e.preventDefault()
                    onClose()
                    setTimeout(() => {
                      document.getElementById('all-websites')?.scrollIntoView()
                    }, 100)
                  }
                }}
                className={cn(
                  'flex items-center gap-2 px-2 py-1.5 text-sm rounded-md transition-colors cursor-pointer',
                  isHomePage
                    ? 'text-foreground font-medium bg-accent'
                    : 'text-muted-foreground hover:text-foreground hover:bg-muted/50'
                )}
              >
                <HomeIcon className="h-4 w-4" />
                All Websites
              </a>
              <button
                type="button"
                onClick={() => {
                  if (pathname === '/') {
                    onClose()
                    setTimeout(() => {
                      document.getElementById('featured')?.scrollIntoView()
                    }, 100)
                  } else {
                    window.location.href = '/#featured'
                  }
                }}
                className="flex items-center justify-between gap-2 px-2 py-1.5 text-sm text-muted-foreground hover:text-foreground hover:bg-muted/50 rounded-md transition-colors w-full text-left"
              >
                <div className="flex items-center gap-2">
                  <Trophy className="h-4 w-4" />
                  Featured
                </div>
                {featuredCount && (
                  <span className="text-xs bg-muted px-1.5 py-0.5 rounded-full">
                    {featuredCount}
                  </span>
                )}
              </button>
              {categories.map(category => (
                <Link
                  key={category.slug}
                  href={getRoute('category.page', { category: category.slug })}
                  className={cn(
                    'flex items-center gap-2 px-2 py-1.5 text-sm rounded-md transition-colors',
                    isCategoryPage(category.slug)
                      ? 'text-foreground font-medium bg-accent'
                      : 'text-muted-foreground hover:text-foreground hover:bg-muted/50'
                  )}
                >
                  <category.icon className="h-4 w-4" />
                  {category.name}
                </Link>
              ))}
            </nav>
          </div>

          {/* Tools */}
          <div>
            <h3 className="font-semibold text-sm mb-3 text-muted-foreground">Tools</h3>
            <nav className="space-y-1">
              {tools.map(tool => (
                <Link
                  key={tool.slug}
                  href={tool.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center justify-between gap-2 px-2 py-1.5 text-sm text-muted-foreground hover:text-foreground hover:bg-muted/50 rounded-md transition-colors group"
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <tool.icon className="h-4 w-4 flex-shrink-0" />
                    <span className="truncate">{tool.name}</span>
                  </div>
                  <ExternalLink className="h-3 w-3 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0" />
                </Link>
              ))}
            </nav>
          </div>
        </div>
      </div>
    </>
  )
}
