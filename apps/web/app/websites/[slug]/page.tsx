import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { JsonLd } from '@/components/json-ld'
import { Section } from '@/components/layout/section'
import { LLMGrid } from '@/components/llm/llm-grid'
import { ProjectNavigation } from '@/components/project-navigation'
import { ToolsSection } from '@/components/sections/tools-section'
import { WebsiteContentSection } from '@/components/website/website-content-section'
import { WebsiteError } from '@/components/website/website-error'
import { WebsiteHero } from '@/components/website/website-hero'
import { WebsiteLLMsSection } from '@/components/website/website-llms-section'
import { getWebsiteBySlug, getWebsites, type WebsiteMetadata } from '@/lib/content-loader'
import { getRoute } from '@/lib/routes'
import { generateWebsiteDetailSchema } from '@/lib/schema'
import { generateDynamicMetadata, SITE_URL } from '@/lib/seo/seo-config'

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
        <JsonLd data={generateWebsiteDetailSchema(project, SITE_URL)} />

        {/* Hero Section */}
        <WebsiteHero website={project} breadcrumbItems={breadcrumbItems} />

        {/* Main Content Area */}
        <div className="container mx-auto px-6 py-8 md:py-12">
          <div className="max-w-4xl mx-auto space-y-12">
            {/* LLMs.txt Files Section */}
            <WebsiteLLMsSection website={project} />

            {/* Content Section */}
            <WebsiteContentSection website={project} />

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
                  viewAllHref={getRoute('website.list')}
                  viewAllText="Browse all websites"
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
    return <WebsiteError />
  }
}
