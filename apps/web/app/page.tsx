import type { Metadata } from "next"
import { HeroSection } from "@/components/sections/hero-section"
import { FeaturedProjectsSection } from "@/components/sections/featured-projects-section"
import { HowItWorksSection } from "@/components/sections/how-it-works-section"
import { LatestUpdatesSection } from "@/components/sections/latest-updates-section"
import { CommunityFavoritesSection } from "@/components/sections/community-favorites-section"
import { LatestNewsSection } from "@/components/sections/latest-news-section"
import { FAQSection } from "@/components/sections/faq-section"
import { CommunityStatsSection } from "@/components/sections/community-stats-section"
import { TestimonialsSection } from "@/components/sections/testimonials-section"
import { NewsletterSection } from "@/components/sections/newsletter-section"
import { CategoriesSection } from "@/components/sections/categories-section"
import { getHomePageData } from "@/app/actions"
import { JsonLd } from "@/components/json-ld"

export const metadata: Metadata = {
  title: "llms.txt hub - Discover AI-Ready Documentation",
  description:
    "Explore AI-friendly websites and tools implementing the llms.txt standard. Find and submit llms.txt files for better AI integration.",
  openGraph: {
    title: "llms.txt hub - Discover AI-Ready Documentation",
    description:
      "Explore AI-friendly websites and tools implementing the llms.txt standard. Find and submit llms.txt files for better AI integration.",
    url: "https://llmstxthub.com",
    siteName: "llms.txt hub",
    images: [
      {
        url: "https://llmstxthub.com/og-image.png",
        width: 1200,
        height: 630,
      },
    ],
    locale: "en_US",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "llms.txt hub - Discover AI-Ready Documentation",
    description:
      "Explore AI-friendly websites and tools implementing the llms.txt standard. Find and submit llms.txt files for better AI integration.",
    images: ["https://llmstxthub.com/og-image.png"],
  },
}

export default async function Home() {
  const { allProjects, featuredProjects, recentlyUpdatedProjects, communityFavorites } = await getHomePageData()

  return (
    <>
      <JsonLd
        data={{
          "@context": "https://schema.org",
          "@type": "WebSite",
          name: "llms.txt hub",
          url: "https://llmstxthub.com",
          description: "Discover AI-Ready Documentation and explore websites implementing the llms.txt standard.",
        }}
      />
      <div className="container mx-auto px-4 py-8 space-y-16">
        <HeroSection />
        <FeaturedProjectsSection projects={featuredProjects} />
        <HowItWorksSection />
        <div className="grid md:grid-cols-2 gap-12">
          <LatestUpdatesSection projects={recentlyUpdatedProjects} />
          <CommunityFavoritesSection projects={communityFavorites} />
        </div>
        <LatestNewsSection />
        <FAQSection />
        <CommunityStatsSection allProjects={allProjects} />
        <TestimonialsSection />
        <NewsletterSection />
        <CategoriesSection />
      </div>
    </>
  )
}

