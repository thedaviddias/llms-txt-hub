import { GitHubProjectCard } from '@/components/github-project-card'
import { ResourcesSidebar } from '@/components/resources/sidebar'
import { fetchGitHubProjects } from '@/lib/github'
import { getAllResources } from '@/lib/resources'
import { formatDate } from '@/lib/utils'
import { Badge } from '@thedaviddias/design-system/badge'
import { Button } from '@thedaviddias/design-system/button'
import { Card } from '@thedaviddias/design-system/card'
import { Book, Code, ExternalLink, Video } from 'lucide-react'
import Link from 'next/link'

const resourceTypes = [
  { name: 'All', icon: Book, slug: 'all' },
  { name: 'Articles', icon: Book, slug: 'articles' },
  { name: 'Tutorials', icon: Video, slug: 'tutorials' },
  { name: 'Open Source Projects', icon: Code, slug: 'open-source' },
]

export default async function ResourcesPage() {
  const { articles, openSourceProjects } = await getAllResources()
  const githubProjects = await fetchGitHubProjects('llms-txt')

  const allResources = [...articles, ...openSourceProjects]

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex flex-col md:flex-row gap-8">
        <ResourcesSidebar />
        {/* Main content */}
        <main className="grow space-y-12">
          <div className="space-y-4">
            <h1 className="text-4xl font-bold">Resources</h1>
            <p className="text-lg text-muted-foreground">
              Explore articles, tutorials, and open-source projects about llms.txt and AI
              documentation.
            </p>
          </div>

          {/* Featured resource */}
          {allResources[0] && (
            <section className="space-y-4">
              <h2 className="text-2xl font-semibold">Featured Resource</h2>
              <Card className="p-6">
                <article className="space-y-4">
                  <Badge variant="secondary">{allResources[0].type}</Badge>
                  <h3 className="text-2xl font-bold">
                    <Link href={allResources[0].url} className="hover:underline" target="_blank">
                      {allResources[0].title}
                      <ExternalLink className="inline-block ml-2 h-5 w-5" />
                    </Link>
                  </h3>
                  <p className="text-muted-foreground">{allResources[0].description}</p>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Badge variant="outline">{allResources[0].source}</Badge>
                      {allResources[0].tags?.map((tag) => (
                        <Badge key={tag} variant="secondary">
                          {tag}
                        </Badge>
                      ))}
                    </div>
                    <time className="text-sm text-muted-foreground" dateTime={allResources[0].date}>
                      {formatDate(allResources[0].date)}
                    </time>
                  </div>
                </article>
              </Card>
            </section>
          )}

          {/* Latest articles and tutorials */}
          <section className="space-y-6">
            <h2 className="text-2xl font-semibold">Latest Articles and Tutorials</h2>
            <div className="grid gap-6">
              {articles.slice(0, 5).map((resource) => (
                <Card key={resource.slug} className="p-6">
                  <article className="space-y-4">
                    <div className="flex items-center justify-between">
                      <Badge variant="secondary">{resource.type}</Badge>
                      <time className="text-sm text-muted-foreground" dateTime={resource.date}>
                        {formatDate(resource.date)}
                      </time>
                    </div>
                    <h3 className="text-xl font-bold">
                      <Link href={resource.url} className="hover:underline" target="_blank">
                        {resource.title}
                        <ExternalLink className="inline-block ml-2 h-4 w-4" />
                      </Link>
                    </h3>
                    <p className="text-muted-foreground">{resource.description}</p>
                    <div className="flex items-center gap-2">
                      <Badge variant="outline">{resource.source}</Badge>
                      {resource.tags?.map((tag) => (
                        <Badge key={tag} variant="secondary">
                          {tag}
                        </Badge>
                      ))}
                    </div>
                  </article>
                </Card>
              ))}
            </div>
            <Button variant="outline" asChild>
              <Link href="/resources/articles">View all articles and tutorials</Link>
            </Button>
          </section>

          {/* GitHub projects */}
          <section className="space-y-6">
            <div className="flex items-center justify-between">
              <h2 className="text-2xl font-semibold">Open Source Projects</h2>
              <Link
                href="https://github.com/topics/llms-txt"
                className="text-sm text-muted-foreground hover:text-foreground"
                target="_blank"
              >
                View all on GitHub
                <ExternalLink className="inline-block ml-1 h-3 w-3" />
              </Link>
            </div>
            <div className="grid gap-6">
              {githubProjects.slice(0, 3).map((project) => (
                <GitHubProjectCard key={project.fullName} project={project} />
              ))}
            </div>
            <Button variant="outline" asChild>
              <Link href="/resources/open-source">View all open source projects</Link>
            </Button>
          </section>
        </main>
      </div>
    </div>
  )
}
