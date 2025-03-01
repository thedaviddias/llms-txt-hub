import { LLMButton } from '@/components/buttons/llm-button'
import { LLMGrid } from '@/components/llm/llm-grid'
import { components } from '@/components/mdx'
import { ProjectNavigation } from '@/components/project-navigation'
import { getAllWebsites, getWebsiteBySlug } from '@/lib/mdx'
import type { WebsiteMetadata } from '@/lib/mdx'
import { Badge } from '@thedaviddias/design-system/badge'
import { Breadcrumb } from '@thedaviddias/design-system/breadcrumb'
import { Card, CardContent, CardHeader } from '@thedaviddias/design-system/card'
import { getBaseUrl } from '@thedaviddias/utils/get-base-url'
import { getFaviconUrl } from '@thedaviddias/utils/get-favicon-url'
import { ExternalLink, Hash } from 'lucide-react'
import type { Metadata } from 'next'
import { MDXRemote } from 'next-mdx-remote/rsc'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { getRoute } from '@/lib/routes'

interface ProjectPageProps {
  params: Promise<{ slug: string }>
}

export async function generateMetadata({ params }: ProjectPageProps): Promise<Metadata> {
  const { slug } = await params

  const project = (await getWebsiteBySlug(slug)) as WebsiteMetadata & {
    content: string
    relatedWebsites: WebsiteMetadata[]
    previousWebsite: WebsiteMetadata | null
    nextWebsite: WebsiteMetadata | null
  }

  if (!project) {
    return {}
  }

  return {
    title: `${project.name} | llms.txt hub`,
    description: project.description
  }
}

export async function generateStaticParams() {
  const websites = await getAllWebsites()
  return websites.map(website => ({
    slug: website.slug
  }))
}

export default async function ProjectPage({ params }: ProjectPageProps) {
  const { slug } = await params

  const project = (await getWebsiteBySlug(slug)) as WebsiteMetadata & {
    content: string
    relatedWebsites: WebsiteMetadata[]
    previousWebsite: WebsiteMetadata | null
    nextWebsite: WebsiteMetadata | null
  }

  if (!project) {
    notFound()
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="max-w-3xl mx-auto space-y-8">
        <Breadcrumb
          items={[
            { name: 'Websites', href: '/website' },
            { name: project.name, href: `/website/${slug}` }
          ]}
          baseUrl={getBaseUrl()}
        />
        <Card>
          <CardHeader className="border-b pb-8">
            <div className="flex items-start gap-4">
              <img
                src={getFaviconUrl(project.website) || '/placeholder.svg'}
                alt={`${project.name} favicon`}
                width={48}
                height={48}
                className="rounded-lg"
              />
              <div className="space-y-2 flex-1">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 flex-wrap">
                      <h1 className="text-3xl font-bold">{project.name}</h1>
                      <Link
                        href={project.website}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-2 px-3 py-1 text-sm bg-secondary hover:bg-secondary/80 text-secondary-foreground rounded-md transition-colors"
                      >
                        Visit Website
                        <ExternalLink className="h-3.5 w-3.5" />
                      </Link>
                    </div>
                    <p className="text-muted-foreground mt-1">{project.description}</p>
                  </div>
                </div>
                {project.category && (
                  <Link
                    href={getRoute('website.withCategory', { category: project.category })}
                    className="inline-flex items-center hover:opacity-80 transition-opacity"
                  >
                    <Badge
                      variant="outline"
                      className="inline-flex items-center gap-1.5 hover:bg-secondary/50 cursor-pointer py-1 px-2"
                    >
                      <Hash className="h-3 w-3 text-muted-foreground" />
                      {project.category.replace(/-/g, ' ')}
                    </Badge>
                  </Link>
                )}
              </div>
            </div>
          </CardHeader>
          <CardContent className="pt-6">
            <div className="flex flex-wrap gap-4">
              <LLMButton href={project.llmsUrl} type="llms" size="lg" />
              {project.llmsFullUrl && (
                <LLMButton href={project.llmsFullUrl} type="llms-full" size="lg" />
              )}
            </div>
          </CardContent>
        </Card>
        <div className="prose dark:prose-invert max-w-none">
          <MDXRemote source={project.content} components={components} />
        </div>
        <ProjectNavigation
          previousWebsite={project.previousWebsite}
          nextWebsite={project.nextWebsite}
        />
        {project.relatedWebsites?.length > 0 && (
          <div className="mt-8">
            <h2 className="text-2xl font-bold mb-4">Related Projects</h2>
            <LLMGrid items={project.relatedWebsites} variant="compact" />
          </div>
        )}
      </div>
    </div>
  )
}
