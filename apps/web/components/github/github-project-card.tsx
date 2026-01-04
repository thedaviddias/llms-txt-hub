import { ExternalLink, Github, Star } from 'lucide-react'
import Link from 'next/link'
import { Card, CardContent } from '@/components/ui/card'
import type { GitHubProject } from '@/lib/github'
import { formatRelativeDate } from '@/lib/utils'

interface GitHubProjectCardProps {
  project: GitHubProject
  index?: number
}

/**
 * Card component for displaying a GitHub project
 *
 * @param props - Component props
 * @param props.project - The GitHub project to display
 * @param props.index - Optional index for staggered animations
 * @returns React component
 */
export function GitHubProjectCard({ project, index = 0 }: GitHubProjectCardProps) {
  return (
    <Card
      className="transition-all hover:border-primary hover:bg-muted/50 relative overflow-hidden animate-fade-in-up group"
      style={{ animationDelay: `${(index + 1) * 50}ms` }}
    >
      <CardContent className="p-4 sm:p-5">
        <div className="flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5">
              <Github className="size-4 text-muted-foreground" />
              <time className="text-xs text-muted-foreground" dateTime={project.lastUpdated}>
                {formatRelativeDate(project.lastUpdated)}
              </time>
            </div>
            <div className="flex items-center gap-1 text-sm">
              <Star className="size-3.5 fill-yellow-500 text-yellow-500" />
              <span className="tabular-nums font-medium">{project.stars.toLocaleString()}</span>
            </div>
          </div>

          <h3 className="font-semibold text-sm sm:text-base line-clamp-1">
            <Link
              href={project.url}
              className="hover:text-primary transition-colors block after:absolute after:inset-0 after:content-[''] z-10"
              target="_blank"
              rel="noopener noreferrer"
            >
              {project.fullName}
              <ExternalLink className="inline-block ml-1.5 size-3.5 opacity-50" />
            </Link>
          </h3>

          <p className="text-xs sm:text-sm text-muted-foreground line-clamp-2">
            {project.description || 'No description available'}
          </p>
        </div>
      </CardContent>
    </Card>
  )
}
