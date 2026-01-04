import { Badge } from '@thedaviddias/design-system/badge'
import { Breadcrumb } from '@thedaviddias/design-system/breadcrumb'
import { Button } from '@thedaviddias/design-system/button'
import { getBaseUrl } from '@thedaviddias/utils/get-base-url'
import { ArrowRight, ExternalLink, Github, Plus, Star } from 'lucide-react'
import type { Metadata } from 'next'
import Link from 'next/link'
import { GitHubProjectCard } from '@/components/github/github-project-card'
import { Card, CardContent } from '@/components/ui/card'
import { fetchGitHubProjects, type GitHubProject } from '@/lib/github'
import { getRoute } from '@/lib/routes'
import { generateBaseMetadata } from '@/lib/seo/seo-config'

export const metadata: Metadata = generateBaseMetadata({
  title: 'Open Source Projects',
  description:
    'Explore open-source projects, tools, and libraries implementing the llms.txt standard.',
  path: '/projects',
  keywords: ['open source', 'GitHub projects', 'llms.txt tools', 'libraries', 'implementations']
})

// Revalidate Projects page hourly to reduce API load
export const revalidate = 3600

export default async function ProjectsPage() {
  // Fetch projects with both topics concurrently
  const [projects1, projects2] = await Promise.all([
    fetchGitHubProjects('llms-txt'),
    fetchGitHubProjects('llmstxt')
  ])

  // Create a Map to deduplicate projects by full name
  const projectsMap = new Map<string, GitHubProject>()

  // Add all projects to the map, with full name as key
  const allProjects = [...projects1, ...projects2]
  allProjects.forEach(project => {
    projectsMap.set(project.fullName, project)
  })

  // Convert map back to array and sort by stars
  const sortedProjects = Array.from(projectsMap.values()).sort((a, b) => b.stars - a.stars)

  // Featured project is the one with most stars
  const featuredProject = sortedProjects[0]
  const remainingProjects = sortedProjects.slice(1)

  return (
    <div className="container mx-auto py-8">
      <div className="space-y-12">
        <Breadcrumb items={[{ name: 'Projects', href: '/projects' }]} baseUrl={getBaseUrl()} />

        {/* Header */}
        <div className="space-y-2">
          <h1 className="text-4xl font-bold tracking-tight flex items-center gap-3">
            <span className="size-2 bg-primary rounded-full" />
            Open Source Projects
          </h1>
          <p className="text-lg text-muted-foreground max-w-3xl">
            Discover open-source projects, tools, and libraries implementing the llms.txt standard.
            Add the{' '}
            <Link
              href="https://github.com/topics/llms-txt"
              className="font-medium text-foreground underline underline-offset-4 hover:text-primary transition-colors"
              target="_blank"
              rel="noopener noreferrer"
            >
              llms-txt
            </Link>{' '}
            or{' '}
            <Link
              href="https://github.com/topics/llmstxt"
              className="font-medium text-foreground underline underline-offset-4 hover:text-primary transition-colors"
              target="_blank"
              rel="noopener noreferrer"
            >
              llmstxt
            </Link>{' '}
            topic to your GitHub repository to be listed.
          </p>
        </div>

        {/* Featured Project */}
        {featuredProject && (
          <Card className="transition-all hover:border-primary hover:bg-muted/50 relative overflow-hidden animate-fade-in-up">
            <CardContent className="p-6 sm:p-8">
              <div className="flex flex-col gap-4">
                <div className="flex items-center justify-between">
                  <Badge variant="secondary" className="bg-primary/10 text-primary">
                    Most Starred
                  </Badge>
                  <div className="flex items-center gap-1.5 text-sm font-medium">
                    <Star className="size-4 fill-yellow-500 text-yellow-500" />
                    <span className="tabular-nums">{featuredProject.stars.toLocaleString()}</span>
                  </div>
                </div>

                <div className="space-y-3">
                  <div className="flex items-center gap-3">
                    <Github className="size-6" />
                    <h2 className="text-xl sm:text-2xl font-bold tracking-tight">
                      <Link
                        href={featuredProject.url}
                        className="hover:text-primary transition-colors block after:absolute after:inset-0 after:content-[''] z-10"
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        {featuredProject.fullName}
                      </Link>
                    </h2>
                  </div>
                  <p className="text-muted-foreground">{featuredProject.description}</p>
                </div>

                <div className="flex items-center gap-3 pt-2">
                  <span className="text-sm font-medium text-primary flex items-center gap-1">
                    View project
                    <ArrowRight className="size-4" />
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* All Projects Grid */}
        {remainingProjects.length > 0 && (
          <section className="space-y-6">
            <h2 className="text-sm font-bold uppercase tracking-wider text-muted-foreground">
              All Projects ({remainingProjects.length})
            </h2>
            <div className="grid gap-4 sm:gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {remainingProjects.map((project, index) => (
                <GitHubProjectCard key={project.fullName} project={project} index={index} />
              ))}
            </div>
          </section>
        )}

        {/* Submit Project CTA */}
        <Card className="border-dashed">
          <CardContent className="p-8 text-center">
            <div className="mx-auto max-w-2xl space-y-4">
              <div className="size-12 rounded-full bg-muted flex items-center justify-center mx-auto">
                <Plus className="size-6 text-muted-foreground" />
              </div>
              <h2 className="text-2xl font-bold tracking-tight">Have a Project to Share?</h2>
              <p className="text-muted-foreground">
                Add the{' '}
                <code className="px-1.5 py-0.5 bg-muted rounded text-sm font-mono">llms-txt</code>{' '}
                topic to your GitHub repository to have it listed here automatically.
              </p>
              <div className="flex justify-center gap-3 pt-2">
                <Button asChild className="rounded-none h-9 font-bold">
                  <Link
                    href="https://github.com/topics/llms-txt"
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    Browse GitHub Topic
                    <ExternalLink className="ml-2 size-4" />
                  </Link>
                </Button>
                <Button variant="outline" asChild className="rounded-none h-9 font-bold">
                  <Link href={getRoute('submit')}>Submit Website</Link>
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
