import { Breadcrumb } from '@thedaviddias/design-system/breadcrumb'
import { Button } from '@thedaviddias/design-system/button'
import { getBaseUrl } from '@thedaviddias/utils/get-base-url'
import { Code, ExternalLink, Star } from 'lucide-react'
import type { Metadata } from 'next'
import Link from 'next/link'
import { GitHubProjectCard } from '@/components/github/github-project-card'
import { Card } from '@/components/ui/card'
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

export default async function ProjectsPage() {
  // Fetch projects with both topics
  const projects1 = await fetchGitHubProjects('llms-txt')
  const projects2 = await fetchGitHubProjects('llmstxt')

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

  return (
    <div className="container mx-auto py-8">
      <div className="space-y-12">
        <Breadcrumb items={[{ name: 'Projects', href: '/projects' }]} baseUrl={getBaseUrl()} />

        <div className="space-y-4">
          <h1 className="text-4xl font-bold">Open Source Projects</h1>
          <p className="text-lg text-muted-foreground">
            Discover open-source projects, tools, and libraries implementing the llms.txt standard.
            <br />
            To list your project here, add either the{' '}
            <Link
              href="https://github.com/topics/llms-txt"
              className="underline hover:text-primary"
              target="_blank"
              rel="noopener noreferrer"
            >
              llms-txt
            </Link>{' '}
            or{' '}
            <Link
              href="https://github.com/topics/llmstxt"
              className="underline hover:text-primary"
              target="_blank"
              rel="noopener noreferrer"
            >
              llmstxt
            </Link>{' '}
            topic to your GitHub repository.
          </p>
        </div>

        {/* Featured Project */}
        {featuredProject && (
          <section className="space-y-4">
            <h2 className="text-2xl font-semibold">Featured Project</h2>
            <Card className="p-6">
              <article className="space-y-6">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <Code className="size-6" />
                    <h3 className="text-2xl font-bold">
                      <Link
                        href={featuredProject.url}
                        className="hover:underline"
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        {featuredProject.fullName}
                        <ExternalLink className="inline-block ml-2 h-5 w-5" />
                      </Link>
                    </h3>
                  </div>
                  <div className="flex items-center gap-1">
                    <Star className="size-4" />
                    <span>{featuredProject.stars}</span>
                  </div>
                </div>
                <p className="text-lg text-muted-foreground">{featuredProject.description}</p>
                <div className="flex items-center gap-2">
                  <Button asChild>
                    <Link href={featuredProject.url} target="_blank" rel="noopener noreferrer">
                      View Project
                      <ExternalLink className="ml-2 size-4" />
                    </Link>
                  </Button>
                  <Button variant="outline" asChild>
                    <Link
                      href="https://github.com/topics/llms-txt"
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      Browse All Projects
                      <ExternalLink className="ml-2 size-4" />
                    </Link>
                  </Button>
                </div>
              </article>
            </Card>
          </section>
        )}

        {/* All Projects */}
        <section className="space-y-6">
          <h2 className="text-2xl font-semibold">All Projects</h2>
          <div className="grid gap-6">
            {sortedProjects.slice(1).map(project => (
              <GitHubProjectCard key={project.fullName} project={project} />
            ))}
          </div>
        </section>

        {/* Submit Project CTA */}
        <section className="rounded-lg bg-muted p-8 text-center">
          <div className="mx-auto max-w-2xl space-y-4">
            <h2 className="text-2xl font-bold">Have a Project to Share?</h2>
            <p className="text-muted-foreground">
              Add the 'llms-txt' topic to your GitHub repository to have it listed here.
            </p>
            <div className="flex justify-center gap-4">
              <Button asChild>
                <Link
                  href="https://github.com/topics/llms-txt"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  Browse GitHub Topic
                  <ExternalLink className="ml-2 size-4" />
                </Link>
              </Button>
              <Button variant="outline" asChild>
                <Link href={getRoute('submit')}>Submit Project</Link>
              </Button>
            </div>
          </div>
        </section>
      </div>
    </div>
  )
}
