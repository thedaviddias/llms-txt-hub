import { Alert, AlertDescription, AlertTitle } from '@thedaviddias/design-system/alert'
import { Badge } from '@thedaviddias/design-system/badge'
import { Breadcrumb } from '@thedaviddias/design-system/breadcrumb'
import { Card, CardContent, CardHeader } from '@thedaviddias/design-system/card'
import { getBaseUrl } from '@thedaviddias/utils/get-base-url'
import { getFaviconUrl } from '@thedaviddias/utils/get-favicon-url'
import { AlertTriangle, ExternalLink, Hash } from 'lucide-react'
import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { MDXRemote } from 'next-mdx-remote/rsc'
import { LLMButton } from '@/components/buttons/llm-button'
import { JsonLd } from '@/components/json-ld'
import { LLMGrid } from '@/components/llm/llm-grid'
import { components } from '@/components/mdx'
import { ProjectNavigation } from '@/components/project-navigation'
import { ToolsSection } from '@/components/sections/tools-section'
import { getWebsiteBySlug, getWebsites, type WebsiteMetadata } from '@/lib/content-loader'
import { getRoute } from '@/lib/routes'
import { generateArticleSchema, generateWebsiteSchema } from '@/lib/schema'

interface ProjectPageProps {
  params: { slug: string }
}

export async function generateMetadata({ params }: ProjectPageProps): Promise<Metadata> {
  const { slug } = await params

  try {
    const project = await getWebsiteBySlug(slug)

    if (!project) {
      return {}
    }

    return {
      title: `${project.name} | llms.txt hub`,
      description: project.description,
      publisher: 'llms.txt hub',
      category: project.category,
      classification: project.category,
      openGraph: {
        title: `${project.name} | llms.txt hub`,
        description: project.description,
        url: `${getBaseUrl()}/websites/${project.slug}`,
        type: 'website'
      }
    }
  } catch (error) {
    return {
      title: 'Website | llms.txt hub',
      description: 'Website information'
    }
  }
}

export async function generateStaticParams() {
  try {
    const websites = await getWebsites()

    if (!websites || websites.length === 0) {
      return []
    }

    // Only include websites with valid string slugs
    const params = websites
      .filter((website: WebsiteMetadata) => website.slug && typeof website.slug === 'string')
      .map((website: WebsiteMetadata) => ({
        slug: website.slug
      }))

    return params
  } catch (error) {
    return []
  }
}

export default async function ProjectPage({ params }: ProjectPageProps) {
  try {
    const { slug } = await params

    const project = await getWebsiteBySlug(slug)

    if (!project) {
      notFound()
    }

    const breadcrumbItems = [
      { name: 'Websites', href: getRoute('website.list') },
      { name: project.name, href: getRoute('website.detail', { slug: project.slug }) }
    ]

    return (
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-3xl mx-auto space-y-8">
          <JsonLd
            data={{
              '@context': 'https://schema.org',
              '@graph': [generateWebsiteSchema(project), generateArticleSchema(project)]
            }}
          />
          <Breadcrumb items={breadcrumbItems} baseUrl={getBaseUrl()} />
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
                        {project.isUnofficial && (
                          <Badge
                            variant="outline"
                            className="text-sm border-yellow-500/20 bg-yellow-500/10 dark:border-yellow-400/30 dark:bg-yellow-400/10 text-yellow-700 dark:text-yellow-300 hover:bg-yellow-500/20 dark:hover:bg-yellow-400/20 transition-colors"
                          >
                            Unofficial
                          </Badge>
                        )}
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
            <MDXRemote source={project.content || ''} components={components} />
          </div>

          <ToolsSection layout="compact" />
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
  } catch (error) {
    return (
      <div className="container mx-auto px-4 py-8">
        <Alert variant="destructive" className="mb-6">
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>Error loading website</AlertTitle>
          <AlertDescription>
            There was a problem loading this website. Please try again later or{' '}
            <Link href={getRoute('website.list')} className="underline font-medium">
              return to the websites list
            </Link>
            .
          </AlertDescription>
        </Alert>
      </div>
    )
  }
}
