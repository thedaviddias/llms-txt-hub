import { getHomePageData } from '@/actions/get-home-page-data'
import { JsonLd } from '@/components/json-ld'
import { CategoriesSection } from '@/components/sections/categories-section'
import { CommunityStatsSection } from '@/components/sections/community-stats-section'
import { FAQSection } from '@/components/sections/faq-section'
import { FeaturedProjectsSection } from '@/components/sections/featured-projects-section'
import { HeroSection } from '@/components/sections/hero-section'
import { HowItWorksSection } from '@/components/sections/how-it-works-section'
import { LatestNewsSection } from '@/components/sections/latest-news-section'
import { LatestUpdatesSection } from '@/components/sections/latest-updates-section'
import { NewsletterSection } from '@/components/sections/newsletter-section'
import { getBaseUrl } from '@thedaviddias/utils/get-base-url'
import type { Metadata } from 'next'

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
  const { featuredProjects, allProjects, recentlyUpdatedProjects } = await getHomePageData()

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
        <HowItWorksSection />
        <LatestUpdatesSection projects={recentlyUpdatedProjects} />
        <LatestNewsSection />
        <CategoriesSection />
        <FAQSection />
        <CommunityStatsSection allProjects={allProjects} />
        <NewsletterSection />
      </div>
    </>
  )
}
