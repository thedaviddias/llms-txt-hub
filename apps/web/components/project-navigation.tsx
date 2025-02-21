import { getRoute } from '@/lib/routes'
import { Button } from '@thedaviddias/design-system/button'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import Link from 'next/link'

interface ProjectNavigationProps {
  previousProject: { slug: string; name: string } | null
  nextProject: { slug: string; name: string } | null
}

export function ProjectNavigation({ previousProject, nextProject }: ProjectNavigationProps) {
  return (
    <div className="flex justify-between items-center mt-8 space-x-4">
      {previousProject ? (
        <Button variant="outline" asChild>
          <Link
            href={getRoute('website.detail', { slug: previousProject.slug })}
            className="flex items-center"
          >
            <ChevronLeft className="mr-2 h-4 w-4" />
            <span className="hidden sm:inline">Previous:</span> {previousProject.name}
          </Link>
        </Button>
      ) : (
        <div /> // Empty div to maintain layout when there's no previous project
      )}
      {nextProject ? (
        <Button variant="outline" asChild>
          <Link
            href={getRoute('website.detail', { slug: nextProject.slug })}
            className="flex items-center"
          >
            <span className="hidden sm:inline">Next:</span> {nextProject.name}
            <ChevronRight className="ml-2 h-4 w-4" />
          </Link>
        </Button>
      ) : (
        <div /> // Empty div to maintain layout when there's no next project
      )}
    </div>
  )
}
