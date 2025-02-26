import { getRoute } from '@/lib/routes'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import Link from 'next/link'

interface ProjectNavigationProps {
  previousWebsite: { slug: string; name: string } | null
  nextWebsite: { slug: string; name: string } | null
}

export function ProjectNavigation({ previousWebsite, nextWebsite }: ProjectNavigationProps) {
  return (
    <div className="flex justify-between items-center mt-8 gap-4">
      {previousWebsite ? (
        <Link
          href={getRoute('website.detail', { slug: previousWebsite.slug })}
          className="flex items-center p-2 -ml-2 hover:bg-muted rounded-md transition-colors group"
        >
          <ChevronLeft className="mr-2 h-5 w-5 text-muted-foreground group-hover:text-foreground transition-colors" />
          <div className="flex flex-col">
            <span className="text-sm text-muted-foreground">Previous</span>
            <span className="font-medium group-hover:text-foreground transition-colors">
              {previousWebsite.name}
            </span>
          </div>
        </Link>
      ) : (
        <div /> // Empty div to maintain layout when there's no previous project
      )}
      {nextWebsite ? (
        <Link
          href={getRoute('website.detail', { slug: nextWebsite.slug })}
          className="flex items-center p-2 -mr-2 hover:bg-muted rounded-md transition-colors group text-right"
        >
          <div className="flex flex-col">
            <span className="text-sm text-muted-foreground">Next</span>
            <span className="font-medium group-hover:text-foreground transition-colors">
              {nextWebsite.name}
            </span>
          </div>
          <ChevronRight className="ml-2 h-5 w-5 text-muted-foreground group-hover:text-foreground transition-colors" />
        </Link>
      ) : (
        <div />
      )}
    </div>
  )
}
