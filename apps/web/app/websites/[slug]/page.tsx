import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { JsonLd } from '@/components/json-ld'
import { ProjectNavigation } from '@/components/project-navigation'
import { ToolsSection } from '@/components/sections/tools-section'
import { WebsiteContentSection } from '@/components/website/website-content-section'
import { WebsiteDetailSidebar } from '@/components/website/website-detail-sidebar'
import { WebsiteDocsSection } from '@/components/website/website-docs-section'
import { WebsiteError } from '@/components/website/website-error'
import { WebsiteHero } from '@/components/website/website-hero'
import { WebsiteRelatedProjects } from '@/components/website/website-related-projects'
import { getWebsiteBySlug, getWebsites, type WebsiteMetadata } from '@/lib/content-loader'
import { getRoute } from '@/lib/routes'
import { generateWebsiteDetailSchema } from '@/lib/schema'
import { generateDynamicMetadata } from '@/lib/seo/seo-config'

interface ProjectPageProps {
  params: Promise<{ slug: string }>
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
      publishedAt: project.publishedAt
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
      { name: 'Websites', href: getRoute('website.list') },
      { name: project.name, href: getRoute('website.detail', { slug: project.slug }) }
    ]

    return (
      <div className="min-h-screen">
        <JsonLd data={generateWebsiteDetailSchema(project)} />

        {/* Hero Section */}
        <WebsiteHero website={project} breadcrumbItems={breadcrumbItems} />

        {/* Main Content Area */}
        <div className="container mx-auto px-6 py-10 md:py-14">
          <div className="max-w-6xl mx-auto">
            {/* Two-column grid: content + sidebar */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-10">
              {/* Main content column */}
              <div className="lg:col-span-8 space-y-14 md:space-y-16">
                {/* CLI Install + LLMs.txt Files */}
                <WebsiteDocsSection website={project} />

                {/* Content Section */}
                <WebsiteContentSection website={project} />

                {/* Tools Section */}
                <section className="animate-fade-in-up opacity-0 stagger-5">
                  <ToolsSection layout="default" showImages={false} />
                </section>
              </div>

              {/* Sidebar column */}
              <div className="lg:col-span-4">
                <WebsiteDetailSidebar website={project} />
              </div>
            </div>

            {/* Full-width sections below the grid */}
            <div className="mt-14 md:mt-16 space-y-14 md:space-y-16">
              {/* Navigation */}
              <section
                className="animate-fade-in-up opacity-0 stagger-6"
                aria-labelledby="browse-more-heading"
              >
                <div className="rounded-2xl border border-border/50 bg-card/50 backdrop-blur-sm p-6 md:p-8">
                  <h2
                    id="browse-more-heading"
                    className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-4"
                  >
                    Browse more
                  </h2>
                  <ProjectNavigation
                    previousWebsite={project.previousWebsite}
                    nextWebsite={project.nextWebsite}
                  />
                </div>
              </section>

              {/* Related Projects */}
              {project.relatedWebsites?.length > 0 && (
                <WebsiteRelatedProjects websites={project.relatedWebsites} />
              )}
            </div>
          </div>
        </div>
      </div>
    )
  } catch (_error) {
    return <WebsiteError />
  }
}
