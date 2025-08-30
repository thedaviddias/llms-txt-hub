import { Alert, AlertDescription, AlertTitle } from '@thedaviddias/design-system/alert'
import { Badge } from '@thedaviddias/design-system/badge'
import { Breadcrumb } from '@thedaviddias/design-system/breadcrumb'
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
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { getWebsiteBySlug, getWebsites, type WebsiteMetadata } from '@/lib/content-loader'
import { getRoute } from '@/lib/routes'
import { generateArticleSchema, generateWebsiteSchema } from '@/lib/schema'
import { generateAltText, generateDynamicMetadata } from '@/lib/seo/seo-config'

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

    return generateDynamicMetadata({
      type: 'website',
      name: project.name,
      description: project.description,
      slug: project.slug,
      additionalKeywords: [project.category, 'llms.txt'].filter(Boolean) as string[],
      publishedAt: project.publishedAt
    })
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
      { name: 'Websites', href: getRoute('home') },
      { name: project.name, href: getRoute('website.detail', { slug: project.slug }) }
    ]

    return (
      <div className="container mx-auto px-6 py-8">
        <div className="max-w-4xl mx-auto space-y-8">
          <JsonLd
            data={{
              '@context': 'https://schema.org',
              '@graph': [generateWebsiteSchema(project), generateArticleSchema(project)]
            }}
          />
          <Breadcrumb items={breadcrumbItems} baseUrl={getBaseUrl()} />
          <Card className="overflow-hidden bg-gradient-to-br from-slate-50/50 via-white to-slate-50/30 dark:from-slate-800/20 dark:via-slate-900/10 dark:to-slate-800/20">
            <CardHeader className="border-b pb-8 px-0">
              <div className="flex items-start gap-4">
                <div className="relative overflow-hidden rounded-lg">
                  <div className="absolute inset-0 bg-gradient-to-br from-primary/20 to-primary/5 blur-xl" />
                  <Link
                    href={project.website}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 text-sm font-medium text-foreground/80 hover:text-foreground transition-all hover:gap-2 group"
                  >
                    <img
                      src={getFaviconUrl(project.website) || '/placeholder.svg'}
                      alt={generateAltText('favicon', project.name)}
                      width={56}
                      height={56}
                      className="rounded-lg relative z-10 shadow-sm"
                      loading="eager"
                    />
                  </Link>
                </div>
                <div className="space-y-3 flex-1">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1">
                      <div>
                        <div className="flex items-center gap-2 mb-2">
                          <h1 className="text-2xl font-bold">{project.name}</h1>
                          {project.isUnofficial && (
                            <Badge
                              variant="outline"
                              className="text-xs border-yellow-500/20 bg-yellow-500/10 dark:border-yellow-400/30 dark:bg-yellow-400/10 text-yellow-700 dark:text-yellow-300"
                            >
                              Unofficial
                            </Badge>
                          )}
                        </div>
                        <Link
                          href={project.website}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1.5 text-sm font-medium text-foreground/80 hover:text-foreground transition-all hover:gap-2 group"
                        >
                          <span className="border-b border-dashed border-foreground/30 group-hover:border-foreground/50">
                            {project.website.replace(/^https?:\/\/(www\.)?/, '').replace(/\/$/, '')}
                          </span>
                          <ExternalLink className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5" />
                        </Link>
                      </div>
                      <p className="text-muted-foreground mt-2.5 leading-relaxed">
                        {project.description}
                      </p>
                    </div>
                  </div>
                  {project.category && (
                    <Link
                      href={getRoute('category.page', { category: project.category })}
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
            <CardContent className="pt-6 py-0 px-0">
              <div className="flex flex-wrap gap-4">
                <LLMButton href={project.llmsUrl} type="llms" size="lg" />
                {project.llmsFullUrl && (
                  <LLMButton href={project.llmsFullUrl} type="llms-full" size="lg" />
                )}
              </div>
            </CardContent>
          </Card>
          {/* Content Section with SEO Fallback */}
          {project.content ? (
            <div className="prose dark:prose-invert max-w-none">
              <MDXRemote source={project.content} components={components} />
            </div>
          ) : (
            <Card>
              <CardContent className="pt-6 space-y-6">
                {/* Simple structured content for SEO */}
                <div>
                  <h2 className="text-lg font-semibold mb-3">About {project.name}</h2>
                  <p className="text-muted-foreground leading-relaxed">
                    {project.description} This platform provides AI-ready documentation through the
                    llms.txt standard, making it easy for AI assistants to understand and interact
                    with their services.
                  </p>
                </div>

                {/* Key Information */}
                <div>
                  <h3 className="text-base font-semibold mb-3">Key Information</h3>
                  <dl className="grid sm:grid-cols-2 gap-x-6 gap-y-3">
                    <div>
                      <dt className="text-sm font-medium text-muted-foreground">Category</dt>
                      <dd className="text-sm mt-0.5">
                        {project.category ? project.category.replace(/-/g, ' ') : 'General'}
                      </dd>
                    </div>
                    <div>
                      <dt className="text-sm font-medium text-muted-foreground">Type</dt>
                      <dd className="text-sm mt-0.5">Website</dd>
                    </div>
                    <div>
                      <dt className="text-sm font-medium text-muted-foreground">Documentation</dt>
                      <dd className="text-sm mt-0.5">llms.txt compatible</dd>
                    </div>
                    <div>
                      <dt className="text-sm font-medium text-muted-foreground">Added</dt>
                      <dd className="text-sm mt-0.5">
                        {project.publishedAt
                          ? new Date(project.publishedAt).toLocaleDateString()
                          : 'Recently'}
                      </dd>
                    </div>
                  </dl>
                </div>

                {/* How to Use */}
                <div>
                  <h3 className="text-base font-semibold mb-3">How to Access</h3>
                  <p className="text-sm text-muted-foreground mb-3">
                    Access the AI-ready documentation for {project.name} through the links below.
                    The llms.txt file provides a concise overview, while the full version includes
                    comprehensive documentation.
                  </p>
                </div>
              </CardContent>
            </Card>
          )}

          <ToolsSection layout="default" showImages={false} />
          <ProjectNavigation
            previousWebsite={project.previousWebsite}
            nextWebsite={project.nextWebsite}
          />
          {project.relatedWebsites?.length > 0 && (
            <div className="space-y-4">
              <h2 className="text-xl font-bold">Related Projects</h2>
              <LLMGrid
                items={project.relatedWebsites.slice(0, 3)}
                analyticsSource="related-projects"
                className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4"
                overrideGrid={true}
              />
            </div>
          )}
        </div>
      </div>
    )
  } catch (error) {
    return (
      <div className="container mx-auto px-6 py-8">
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
