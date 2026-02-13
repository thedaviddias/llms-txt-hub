import { Breadcrumb } from '@thedaviddias/design-system/breadcrumb'
import { Trophy } from 'lucide-react'
import type { Metadata } from 'next'
import { getHomePageData } from '@/actions/get-home-page-data'
import { CategoryWebsitesList } from '@/components/category-websites-list'
import { JsonLd } from '@/components/json-ld'
import { AppSidebar } from '@/components/layout/app-sidebar'
import { FeaturedGuidesSection } from '@/components/sections/featured-guides-section'
import { NewsletterSection } from '@/components/sections/newsletter-section'
import { ToolsSection } from '@/components/sections/tools-section'
import { getGuides } from '@/lib/content-loader'
import { generateBaseMetadata } from '@/lib/seo/seo-config'

export const metadata: Metadata = generateBaseMetadata({
  title: 'Featured AI-Ready Websites - llms.txt hub',
  description:
    'Discover our curated selection of the best AI-ready websites and tools implementing the llms.txt standard.',
  keywords: ['featured', 'curated', 'best websites', 'llms.txt', 'AI documentation'],
  path: '/featured'
})

export default async function FeaturedPage() {
  const { featuredProjects } = await getHomePageData()
  const featuredGuides = await getGuides()

  return (
    <>
      <JsonLd
        data={{
          '@context': 'https://schema.org',
          '@type': 'CollectionPage',
          '@id': 'https://llmstxthub.com/featured',
          name: 'Featured - llms.txt hub',
          headline: `${featuredProjects.length}+ Featured AI-Ready Sites & Tools`,
          description: `Explore ${featuredProjects.length}+ curated featured websites and tools implementing the llms.txt standard. Hand-picked for quality and innovation.`,
          url: 'https://llmstxthub.com/featured',
          inLanguage: 'en-US',
          isPartOf: {
            '@type': 'WebSite',
            '@id': 'https://llmstxthub.com',
            name: 'llms.txt hub',
            description:
              "The world's largest open-source directory of LLM-optimized tools and documentation",
            url: 'https://llmstxthub.com'
          },
          breadcrumb: {
            '@type': 'BreadcrumbList',
            itemListElement: [
              {
                '@type': 'ListItem',
                position: 1,
                name: 'Home',
                item: 'https://llmstxthub.com'
              },
              {
                '@type': 'ListItem',
                position: 2,
                name: 'Featured',
                item: 'https://llmstxthub.com/featured'
              }
            ]
          },
          numberOfItems: featuredProjects.length,
          itemListElement: featuredProjects.slice(0, 10).map((project, index) => ({
            '@type': 'ListItem',
            position: index + 1,
            url: project.website,
            name: project.name,
            description: project.description
          })),
          mainEntity: {
            '@type': 'ItemList',
            name: 'Featured Websites and Tools',
            description: 'Curated selection of the best AI-ready websites and tools',
            numberOfItems: featuredProjects.length,
            itemListOrder: 'https://schema.org/ItemListOrderAscending',
            itemListElement: featuredProjects.slice(0, 20).map((project, index) => ({
              '@type': 'Thing',
              position: index + 1,
              url: project.website,
              name: project.name
            }))
          },
          publisher: {
            '@type': 'Organization',
            name: 'llms.txt hub',
            url: 'https://llmstxthub.com',
            logo: {
              '@type': 'ImageObject',
              url: 'https://llmstxthub.com/logo.png'
            }
          },
          datePublished: new Date().toISOString(),
          dateModified: new Date().toISOString()
        }}
      />

      <div className="border-t">
        <div className="relative flex h-full w-full max-w-full flex-row flex-nowrap">
          <AppSidebar featuredCount={featuredProjects.length} />

          <div className="relative flex h-full w-full flex-col gap-3 px-6 pt-6">
            {/* Breadcrumb Navigation */}
            <Breadcrumb
              items={[{ name: 'Featured', href: '/featured' }]}
              baseUrl="https://llmstxthub.com"
            />

            {/* Featured Websites Section */}
            <section className="space-y-6">
              <div className="sticky top-16 z-35 bg-background border-b py-4 -mx-6 px-6">
                <div className="flex items-center gap-3">
                  <Trophy className="h-6 w-6 text-yellow-500" />
                  <h1 className="text-2xl font-bold">Featured Websites & Tools</h1>
                </div>
                <p className="text-muted-foreground mt-1">
                  Our curated selection of the best AI-ready websites and tools implementing the
                  llms.txt standard
                </p>
              </div>
              <CategoryWebsitesList initialWebsites={featuredProjects} categoryType="non-tool" />
            </section>

            <ToolsSection />
            <FeaturedGuidesSection guides={featuredGuides} />
            <NewsletterSection />
          </div>
        </div>
      </div>
    </>
  )
}
