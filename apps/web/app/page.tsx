import { getHomePageData } from '@/actions/get-home-page-data'
import { JsonLd } from '@/components/json-ld'
import { CategoriesSection } from '@/components/sections/categories-section'
import { FAQSection } from '@/components/sections/faq-section'
import { FeaturedGuidesSection } from '@/components/sections/featured-guides-section'
import { FeaturedProjectsSection } from '@/components/sections/featured-projects-section'
import { HeroSection } from '@/components/sections/hero-section'
import { HowItWorksSection } from '@/components/sections/how-it-works-section'
import { LatestNewsSection } from '@/components/sections/latest-news-section'
import { LatestUpdatesSection } from '@/components/sections/latest-updates-section'
import { NewsletterSection } from '@/components/sections/newsletter-section'
import { ToolsSection } from '@/components/sections/tools-section'
import { getGuides } from '@/lib/content-loader'
import { getBaseUrl } from '@thedaviddias/utils/get-base-url'
import type { Metadata } from 'next'
import { CommunitiesSection } from '@/components/sections/communities-section'

export const metadata: Metadata = {
  title: 'llms.txt hub - Discover AI-Ready Documentation',
  description:
    'Explore AI-friendly websites and tools implementing the llms.txt standard. Find and submit llms.txt files for better AI integration.',
  openGraph: {
    title: 'llms.txt hub - Discover AI-Ready Documentation',
    description:
      'Explore AI-friendly websites and tools implementing the llms.txt standard. Find and submit llms.txt files for better AI integration.',
    url: 'https://llmstxthub.com',
    siteName: 'llms.txt hub',
    images: [
      {
        url: `${getBaseUrl()}/opengraph-image.png`,
        width: 1200,
        height: 630
      }
    ],
    locale: 'en_US',
    type: 'website'
  },
  twitter: {
    card: 'summary_large_image',
    title: 'llms.txt hub - Discover AI-Ready Documentation',
    description:
      'Explore AI-friendly websites and tools implementing the llms.txt standard. Find and submit llms.txt files for better AI integration.',
    images: [`${getBaseUrl()}/opengraph-image.png`]
  }
}

export default async function Home() {
  const { featuredProjects, recentlyUpdatedProjects } = await getHomePageData()
  const featuredGuides = await getGuides()

  return (
    <>
      <JsonLd
        data={{
          '@context': 'https://schema.org',
          '@type': 'WebSite',
          name: 'llms.txt hub',
          url: 'https://llmstxthub.com',
          description:
            'Discover AI-Ready Documentation and explore websites implementing the llms.txt standard.'
        }}
      />
      <div className="max-w-6xl mx-auto px-4 py-8 space-y-16">
        <HeroSection />
        <FeaturedProjectsSection projects={featuredProjects} />
        <FeaturedGuidesSection guides={featuredGuides} />
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          <LatestUpdatesSection projects={recentlyUpdatedProjects} />
          <LatestNewsSection />
        </div>
        <ToolsSection />
        <CategoriesSection />
        <HowItWorksSection />
        {/* <CommunityStatsSection allProjects={allProjects} /> */}
        <FAQSection />
        <CommunitiesSection />
        <NewsletterSection />
      </div>
    </>
  )
}
