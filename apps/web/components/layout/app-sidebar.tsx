'use client'

import { FavoritesLink } from '@/components/ui/favorites-link'
import { categories } from '@/lib/categories'
import { getRoute } from '@/lib/routes'
import { tools } from '@/lib/tools'
import { ExternalLink, Home as HomeIcon, Trophy } from 'lucide-react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'

interface AppSidebarProps {
  currentCategory?: string
  featuredCount?: number
}

/**
 * Application sidebar component with navigation links and categories
 * @param currentCategory - Currently selected category slug
 * @param featuredCount - Number of featured items to display
 * @returns JSX sidebar navigation component
 */
export function AppSidebar({ currentCategory, featuredCount = 0 }: AppSidebarProps) {
  const pathname = usePathname()
  const isHomePage = pathname === '/'
  return (
    <div className="sticky top-16 hidden w-[240px] max-w-[240px] min-w-[240px] overflow-hidden sm:block h-screen border-r">
      <div className="p-4 space-y-6">
        {/* Navigation section with proper heading hierarchy */}
        <h2 className="sr-only">Navigation</h2>

        {/* My Collection Section */}
        <div>
          <h3 className="font-semibold text-sm mb-4 text-muted-foreground">My Collection</h3>
          <nav className="space-y-1">
            <FavoritesLink />
          </nav>
        </div>

        {/* Categories Section */}
        <div>
          <h3 className="font-semibold text-sm mb-4 text-muted-foreground">Categories</h3>
          <nav className="space-y-1">
            <a
              href={isHomePage ? '#all-websites' : `${getRoute('home')}#all-websites`}
              onClick={e => {
                if (isHomePage) {
                  e.preventDefault()
                  document.getElementById('all-websites')?.scrollIntoView()
                }
              }}
              className={`flex items-center gap-2 px-2 py-1 text-sm rounded-md transition-colors cursor-pointer plausible-event-name=Category+Click ${
                !currentCategory
                  ? 'text-foreground font-medium bg-accent'
                  : 'text-muted-foreground hover:text-foreground hover:bg-muted/50'
              }`}
            >
              <HomeIcon className="h-4 w-4" />
              All Websites
            </a>
            <Link
              href="/featured"
              className="flex items-center justify-between gap-2 px-2 py-1 text-sm text-muted-foreground hover:text-foreground hover:bg-muted/50 rounded-md transition-colors cursor-pointer plausible-event-name=Featured+Click"
            >
              <div className="flex items-center gap-2">
                <Trophy className="h-4 w-4" />
                Featured
              </div>
              {featuredCount > 0 && (
                <span className="text-xs bg-muted px-1.5 py-0.5 rounded-full">{featuredCount}</span>
              )}
            </Link>
            {categories.map(category => (
              <Link
                key={category.slug}
                href={getRoute('category.page', { category: category.slug })}
                className={`flex items-center gap-2 px-2 py-1 text-sm rounded-md transition-colors plausible-event-name=Category+Click ${
                  category.slug === currentCategory
                    ? 'text-foreground font-medium bg-accent'
                    : 'text-muted-foreground hover:text-foreground hover:bg-muted/50'
                }`}
              >
                <category.icon className="h-4 w-4" />
                {category.name}
              </Link>
            ))}
          </nav>
        </div>

        {/* Tools Section */}
        <div>
          <h3 className="font-semibold text-sm mb-4 text-muted-foreground">Tools</h3>
          <nav className="space-y-1">
            {tools.map(tool => (
              <Link
                key={tool.slug}
                href={tool.url}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center justify-between gap-2 px-2 py-1 text-sm text-muted-foreground hover:text-foreground hover:bg-muted/50 rounded-md transition-colors group plausible-event-name=Tool+Click"
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
  )
}
