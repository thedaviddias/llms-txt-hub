import { getRoute } from '@/lib/routes'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import Link from 'next/link'

interface ProjectNavigationProps {
  previousWebsite: { slug: string; name: string } | null
  nextWebsite: { slug: string; name: string } | null
}

export function ProjectNavigation({ previousWebsite, nextWebsite }: ProjectNavigationProps) {
  return (
    <div className="flex justify-between items-center mt-8 space-x-4">
      {previousWebsite ? (
        <Link
          href={getRoute('website.detail', { slug: previousWebsite.slug })}
          className="flex items-center"
        >
          <ChevronLeft className="mr-2 h-4 w-4" />
          <span className="hidden sm:inline">Previous:</span> {previousWebsite.name}
        </Link>
      ) : (
        <div /> // Empty div to maintain layout when there's no previous project
      )}
      {nextWebsite ? (
        <Link
          href={getRoute('website.detail', { slug: nextWebsite.slug })}
          className="flex items-center"
        >
          <span className="hidden sm:inline">Next:</span> {nextWebsite.name}
          <ChevronRight className="ml-2 h-4 w-4" />
        </Link>
      ) : (
        <div /> // Empty div to maintain layout when there's no next project
      )}
    </div>
  )
}
