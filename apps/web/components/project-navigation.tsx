import { ChevronLeft, ChevronRight } from 'lucide-react'
import Link from 'next/link'
import { FaviconWithFallback } from '@/components/ui/favicon-with-fallback'
import { getRoute } from '@/lib/routes'

interface ProjectNavItem {
  slug: string
  name: string
  website: string
}

interface ProjectNavigationProps {
  previousWebsite: ProjectNavItem | null
  nextWebsite: ProjectNavItem | null
}

/**
 * Renders previous/next navigation links between project pages
 */
export function ProjectNavigation({ previousWebsite, nextWebsite }: ProjectNavigationProps) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-w-2xl mx-auto">
      {previousWebsite ? (
        <Link
          href={getRoute('website.detail', { slug: previousWebsite.slug })}
          className="group relative overflow-hidden rounded-xl border border-border/50 bg-card/50 hover:bg-card transition-all duration-200 hover:scale-[1.02] hover:shadow-lg backdrop-blur-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
        >
          <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-secondary/5 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
          <div className="relative p-6 flex items-center gap-4">
            <div className="flex-shrink-0 flex items-center gap-3">
              <div className="p-2 rounded-lg bg-muted/50 group-hover:bg-primary/10 transition-colors">
                <ChevronLeft
                  className="h-5 w-5 text-muted-foreground group-hover:text-primary transition-colors"
                  aria-hidden
                />
              </div>
              <FaviconWithFallback
                website={previousWebsite.website}
                name={previousWebsite.name}
                size={40}
                className="rounded-lg"
              />
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-1">
                Previous
              </div>
              <div className="font-semibold truncate group-hover:text-primary transition-colors">
                {previousWebsite.name}
              </div>
            </div>
          </div>
        </Link>
      ) : (
        <div className="md:col-start-1" aria-hidden />
      )}

      {nextWebsite ? (
        <Link
          href={getRoute('website.detail', { slug: nextWebsite.slug })}
          className="group relative overflow-hidden rounded-xl border border-border/50 bg-card/50 hover:bg-card transition-all duration-200 hover:scale-[1.02] hover:shadow-lg backdrop-blur-sm md:col-start-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
        >
          <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-secondary/5 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
          <div className="relative p-6 flex items-center gap-4">
            <div className="flex-1 min-w-0 text-right">
              <div className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-1">
                Next
              </div>
              <div className="font-semibold truncate group-hover:text-primary transition-colors">
                {nextWebsite.name}
              </div>
            </div>
            <div className="flex-shrink-0 flex items-center gap-3">
              <FaviconWithFallback
                website={nextWebsite.website}
                name={nextWebsite.name}
                size={40}
                className="rounded-lg"
              />
              <div className="p-2 rounded-lg bg-muted/50 group-hover:bg-primary/10 transition-colors">
                <ChevronRight
                  className="h-5 w-5 text-muted-foreground group-hover:text-primary transition-colors"
                  aria-hidden
                />
              </div>
            </div>
          </div>
        </Link>
      ) : (
        <div className="md:col-start-2" aria-hidden />
      )}
    </div>
  )
}
