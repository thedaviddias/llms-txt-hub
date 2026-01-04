import { Alert, AlertDescription, AlertTitle } from '@thedaviddias/design-system/alert'
import { Badge } from '@thedaviddias/design-system/badge'
import { Breadcrumb } from '@thedaviddias/design-system/breadcrumb'
import { getBaseUrl } from '@thedaviddias/utils/get-base-url'
import { getFaviconUrl } from '@thedaviddias/utils/get-favicon-url'
import {
  AlertTriangle,
  Calendar,
  ExternalLink,
  FileText,
  Globe,
  Hash,
  Info
} from 'lucide-react'
import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { MDXRemote } from 'next-mdx-remote/rsc'
import { LLMButton } from '@/components/buttons/llm-button'
import { JsonLd } from '@/components/json-ld'
import { Section } from '@/components/layout/section'
import { LLMGrid } from '@/components/llm/llm-grid'
import { components } from '@/components/mdx'
import { ProjectNavigation } from '@/components/project-navigation'
import { ToolsSection } from '@/components/sections/tools-section'
import { FavoriteButton } from '@/components/ui/favorite-button'
import { getWebsiteBySlug, getWebsites, type WebsiteMetadata } from '@/lib/content-loader'
import { getRoute } from '@/lib/routes'
import { generateWebsiteDetailSchema } from '@/lib/schema'
import { generateAltText, generateDynamicMetadata, SITE_URL } from '@/lib/seo/seo-config'

interface ProjectPageProps {
  params: { slug: string }
}

/**
 * Generates metadata for the website page
 *
 * @param params - Page parameters containing the website slug
 * @returns Promise<Metadata> - Generated metadata for the page
 */
export async function generateMetadata({ params }: ProjectPageProps): Promise<Metadata> {
  const { slug } = await params

  try {
    const project = await getWebsiteBySlug(slug)

    if (!project) {
      return {}
    }

    // Format category for display
    const categoryFormatted = project.category
      ? project.category.replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase())
      : null

    // Create an SEO-optimized description
    const seoDescription = `${project.description} Explore ${project.name}'s llms.txt implementation for AI-ready documentation.${categoryFormatted ? ` Category: ${categoryFormatted}.` : ''}`

    // Generate comprehensive keywords
    const keywords = [
      project.name,
      `${project.name} llms.txt`,
      `${project.name} AI documentation`,
      project.category,
      'llms.txt',
      'AI documentation',
      'LLM integration',
      categoryFormatted
    ].filter(Boolean) as string[]

    return generateDynamicMetadata({
      type: 'website',
      name: project.name,
      description: seoDescription.length > 160 ? project.description : seoDescription,
      slug: project.slug,
      additionalKeywords: keywords,
      publishedAt: project.publishedAt,
      updatedAt: project.updatedAt
    })
  } catch (_error) {
    return {
      title: 'Website | llms.txt hub',
      description: 'Website information'
    }
  }
}

/**
 * Generates static parameters for all website pages
 *
 * @returns Promise<Array<{ slug: string }>> - Array of website slugs for static generation
 */
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
  } catch (_error) {
    return []
  }
}

/**
 * Website detail page component
 *
 * @param params - Page parameters containing the website slug
 * @returns Promise<JSX.Element> - Rendered website page
 */
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
      <div className="min-h-screen">
        <JsonLd data={generateWebsiteDetailSchema(project, SITE_URL)} />

        {/* Hero Section */}
        <section className="relative overflow-hidden border-b border-border/50 bg-gradient-to-b from-muted/30 via-background to-background">
          {/* Background Pattern */}
          <div className="absolute inset-0 -z-10">
            <div className="absolute inset-0 bg-[linear-gradient(to_right,#8080800a_1px,transparent_1px),linear-gradient(to_bottom,#8080800a_1px,transparent_1px)] bg-[size:32px_32px]" />
            <div className="absolute left-0 right-0 top-0 -z-10 m-auto h-[310px] w-full bg-gradient-to-br from-primary/5 via-transparent to-secondary/5 blur-[100px]" />
          </div>

          <div className="container mx-auto px-6 py-8 md:py-12">
            {/* Breadcrumb - stagger 1 */}
            <div className="animate-fade-in-up opacity-0 stagger-1 mb-8 max-w-4xl mx-auto">
              <Breadcrumb items={breadcrumbItems} baseUrl={getBaseUrl()} />
            </div>

            {/* Main Hero Content */}
            <div className="animate-fade-in-up opacity-0 stagger-2 max-w-4xl mx-auto">
              <div className="flex flex-col md:flex-row md:items-start gap-6 md:gap-8">
                {/* Favicon/Logo */}
                <div className="flex-shrink-0">
                  <Link
                    href={project.website}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="group relative block"
                  >
                    <div className="absolute -inset-2 rounded-2xl bg-gradient-to-br from-primary/20 to-secondary/20 opacity-0 blur-xl transition-all duration-500 group-hover:opacity-100" />
                    <div className="relative overflow-hidden rounded-2xl border border-border/50 bg-card p-3 shadow-lg transition-all duration-300 group-hover:scale-105 group-hover:shadow-xl">
                      {/* biome-ignore lint/performance/noImgElement: favicon from external URL */}
                      <img
                        src={getFaviconUrl(project.website, 128) || '/placeholder.svg'}
                        alt={generateAltText('favicon', project.name)}
                        width={72}
                        height={72}
                        className="rounded-xl"
                      />
                    </div>
                  </Link>
                </div>

                {/* Content */}
                <div className="flex-1 space-y-4">
                  <div className="flex flex-wrap items-start justify-between gap-4">
                    <div className="space-y-3">
                      {/* Title and Badges */}
                      <div className="flex flex-wrap items-center gap-3">
                        <h1 className="text-3xl md:text-4xl lg:text-5xl font-bold tracking-tight">
                          {project.name}
                        </h1>
                        {project.isUnofficial && (
                          <Badge
                            variant="outline"
                            className="text-xs border-amber-500/30 bg-amber-500/10 text-amber-700 dark:border-amber-400/30 dark:bg-amber-400/10 dark:text-amber-300"
                          >
                            Unofficial
                          </Badge>
                        )}
                      </div>

                      {/* Website URL */}
                      <Link
                        href={project.website}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="group inline-flex items-center gap-2 text-base text-muted-foreground hover:text-foreground transition-colors"
                      >
                        <Globe className="size-4" />
                        <span className="border-b border-dashed border-muted-foreground/50 group-hover:border-foreground/50 transition-colors">
                          {project.website.replace(/^https?:\/\/(www\.)?/, '').replace(/\/$/, '')}
                        </span>
                        <ExternalLink className="size-3.5 transition-transform group-hover:translate-x-0.5" />
                      </Link>
                    </div>

                    {/* Favorite Button */}
                    <FavoriteButton slug={project.slug} size="lg" variant="outline" />
                  </div>

                  {/* Description */}
                  <p className="text-lg text-muted-foreground leading-relaxed max-w-2xl">
                    {project.description}
                  </p>

                  {/* Meta Info Row */}
                  <div className="flex flex-wrap items-center gap-3 pt-1">
                    {project.category && (
                      <Link
                        href={getRoute('category.page', { category: project.category })}
                        className="group"
                      >
                        <Badge
                          variant="secondary"
                          className="inline-flex items-center gap-1.5 py-1.5 px-3 hover:bg-secondary/80 cursor-pointer transition-colors"
                        >
                          <Hash className="size-3.5" />
                          <span className="capitalize">{project.category.replace(/-/g, ' ')}</span>
                        </Badge>
                      </Link>
                    )}
                    {project.publishedAt && (
                      <Badge
                        variant="outline"
                        className="inline-flex items-center gap-1.5 py-1.5 px-3 text-muted-foreground"
                      >
                        <Calendar className="size-3.5" />
                        Added {new Date(project.publishedAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                      </Badge>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Main Content Area */}
        <div className="container mx-auto px-6 py-8 md:py-12">
          <div className="max-w-4xl mx-auto space-y-12">
            {/* LLMs.txt Files Section */}
            <section className="animate-fade-in-up opacity-0 stagger-3">
              <div className="rounded-2xl border border-border/50 bg-card/50 backdrop-blur-sm p-6 md:p-8">
                <div className="flex items-center gap-3 mb-6">
                  <div className="flex items-center justify-center size-10 rounded-xl bg-primary/10">
                    <FileText className="size-5 text-primary" />
                  </div>
                  <div>
                    <h2 className="text-xl font-bold">AI Documentation Files</h2>
                    <p className="text-sm text-muted-foreground">Access the llms.txt files for this website</p>
                  </div>
                </div>
                <div className="flex flex-wrap gap-4">
                  <LLMButton href={project.llmsUrl} type="llms" size="lg" />
                  {project.llmsFullUrl && (
                    <LLMButton href={project.llmsFullUrl} type="llms-full" size="lg" />
                  )}
                </div>
              </div>
            </section>

            {/* Content Section with SEO Fallback */}
            {project.content ? (
              <section className="animate-fade-in-up opacity-0 stagger-4">
                <div className="prose dark:prose-invert max-w-none prose-headings:scroll-mt-20">
                  <MDXRemote source={project.content} components={components} />
                </div>
              </section>
            ) : (
              <section className="animate-fade-in-up opacity-0 stagger-4 space-y-8">
                {/* About Section */}
                <div className="rounded-2xl border border-border/50 bg-card/50 backdrop-blur-sm p-6 md:p-8">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="flex items-center justify-center size-10 rounded-xl bg-blue-500/10">
                      <Info className="size-5 text-blue-600 dark:text-blue-400" />
                    </div>
                    <h2 className="text-xl font-bold">About {project.name}</h2>
                  </div>
                  <p className="text-muted-foreground leading-relaxed">
                    {project.description} This platform provides AI-ready documentation through the
                    llms.txt standard, making it easy for AI assistants to understand and interact
                    with their services.
                  </p>
                </div>

                {/* Key Information Grid */}
                <div className="grid sm:grid-cols-2 gap-4">
                  <div className="rounded-xl border border-border/50 bg-card/30 p-5 space-y-1">
                    <span className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Category</span>
                    <p className="text-base font-semibold capitalize">
                      {project.category ? project.category.replace(/-/g, ' ') : 'General'}
                    </p>
                  </div>
                  <div className="rounded-xl border border-border/50 bg-card/30 p-5 space-y-1">
                    <span className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Type</span>
                    <p className="text-base font-semibold">Website</p>
                  </div>
                  <div className="rounded-xl border border-border/50 bg-card/30 p-5 space-y-1">
                    <span className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Documentation</span>
                    <p className="text-base font-semibold">llms.txt compatible</p>
                  </div>
                  <div className="rounded-xl border border-border/50 bg-card/30 p-5 space-y-1">
                    <span className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Added</span>
                    <p className="text-base font-semibold">
                      {project.publishedAt
                        ? new Date(project.publishedAt).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })
                        : 'Recently'}
                    </p>
                  </div>
                </div>
              </section>
            )}

            {/* Tools Section */}
            <section className="animate-fade-in-up opacity-0 stagger-5">
              <ToolsSection layout="default" showImages={false} />
            </section>

            {/* Navigation */}
            <section className="animate-fade-in-up opacity-0 stagger-6">
              <ProjectNavigation
                previousWebsite={project.previousWebsite}
                nextWebsite={project.nextWebsite}
              />
            </section>

            {/* Related Projects */}
            {project.relatedWebsites?.length > 0 && (
              <section className="animate-fade-in-up opacity-0 stagger-7">
                <Section
                  title="Related Projects"
                  description="Discover similar websites implementing llms.txt"
                  viewAllHref={getRoute('home')}
                  viewAllText="Browse all"
                >
                  <LLMGrid
                    items={project.relatedWebsites.slice(0, 3)}
                    analyticsSource="related-projects"
                    className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4"
                    overrideGrid={true}
                    animateIn={false}
                  />
                </Section>
              </section>
            )}
          </div>
        </div>
      </div>
    )
  } catch (_error) {
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
