import { Breadcrumb } from '@thedaviddias/design-system/breadcrumb'
import { Heart } from 'lucide-react'
import type { Metadata } from 'next'
import { getHomePageData } from '@/actions/get-home-page-data'
import { JsonLd } from '@/components/json-ld'
import { AppSidebar } from '@/components/layout/app-sidebar'
import { FeaturedGuidesSection } from '@/components/sections/featured-guides-section'
import { NewsletterSection } from '@/components/sections/newsletter-section'
import { WebsitesListWithSearch } from '@/components/websites-list-with-search'
import { getGuides } from '@/lib/content-loader'
import { generateBaseMetadata } from '@/lib/seo/seo-config'

export const metadata: Metadata = generateBaseMetadata({
  title: 'Your Favorite Websites - llms.txt hub',
  description:
    'View and manage your collection of favorite AI-ready websites and tools implementing the llms.txt standard.',
  keywords: ['favorites', 'saved websites', 'bookmarks', 'llms.txt', 'AI documentation'],
  path: '/favorites'
})

export default async function FavoritesPage() {
  const { allProjects, featuredProjects } = await getHomePageData()
  const featuredGuides = await getGuides()

  return (
    <>
      <JsonLd
        data={{
          '@context': 'https://schema.org',
          '@type': 'CollectionPage',
          name: 'Favorites - llms.txt hub',
          description: 'Your personal collection of favorite AI-ready websites',
          url: 'https://llmstxthub.com/favorites'
        }}
      />

      <div className="border-t">
        <div className="relative flex h-full w-full max-w-full flex-row flex-nowrap">
          <AppSidebar featuredCount={featuredProjects.length} />

          {/* Main Content */}
          <div className="relative flex h-full w-full flex-col gap-3 px-6 pt-6 pb-16">
            {/* Breadcrumb */}
            <Breadcrumb
              items={[{ name: 'Favorites', href: '/favorites' }]}
              baseUrl="https://llmstxthub.com"
            />

            {/* Header */}
            <div className="mb-6">
              <div className="flex items-center gap-3 mb-3">
                <Heart className="h-8 w-8 text-red-500 fill-red-500" />
                <h1 className="text-3xl font-bold">Your Favorites</h1>
              </div>
              <p className="text-muted-foreground">
                Your personal collection of favorite AI-ready websites and tools
              </p>
            </div>

            {/* Favorites List with Search and Filters */}
            <WebsitesListWithSearch initialWebsites={allProjects} initialShowFavoritesOnly={true} />

            {/* Additional Sections */}
            <div className="mt-12 space-y-8">
              <FeaturedGuidesSection guides={featuredGuides} />
              <NewsletterSection />
            </div>
          </div>
        </div>
      </div>
    </>
  )
}
