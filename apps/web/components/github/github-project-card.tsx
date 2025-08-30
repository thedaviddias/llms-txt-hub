import { ExternalLink, Github, Star } from 'lucide-react'
import Link from 'next/link'
import { Card } from '@/components/ui/card'
import type { GitHubProject } from '@/lib/github'
import { formatDate } from '@/lib/utils'

interface GitHubProjectCardProps {
  project: GitHubProject
}

export function GitHubProjectCard({ project }: GitHubProjectCardProps) {
  return (
    <Card className="p-6 transition-all hover:border-primary hover:bg-muted/50">
      <article className="space-y-4">
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-2">
                <Github className="h-5 w-5" />
                <h3 className="text-xl font-bold">
                  <Link href={project.url} className="hover:underline" target="_blank">
                    {project.fullName}
                    <ExternalLink className="inline-block ml-2 size-4" />
                  </Link>
                </h3>
              </div>
            </div>
            <div className="flex items-center gap-1">
              <Star className="size-4" />
              <span>{project.stars.toLocaleString()}</span>
            </div>
          </div>
          <time className="text-sm text-muted-foreground" dateTime={project.lastUpdated}>
            Last updated: {formatDate(project.lastUpdated)}
          </time>
        </div>
        <p className="text-muted-foreground">{project.description}</p>
      </article>
    </Card>
  )
}
