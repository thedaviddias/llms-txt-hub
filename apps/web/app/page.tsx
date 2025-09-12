import type { Metadata } from 'next'
import { getHomePageData } from '@/actions/get-home-page-data'
import { JsonLd } from '@/components/json-ld'
import { AppSidebar } from '@/components/layout/app-sidebar'
import { CreatorProjectsSection } from '@/components/sections/creator-projects-section'
import { FeaturedGuidesSection } from '@/components/sections/featured-guides-section'
import { FeaturedProjectsSection } from '@/components/sections/featured-projects-section'
import { HeroSection } from '@/components/sections/hero-section'
import { HowItWorksSection } from '@/components/sections/how-it-works-section'
import { LatestMembersSection } from '@/components/sections/latest-members-section'
import { NewsletterSection } from '@/components/sections/newsletter-section'
import { RecentlyAddedSection } from '@/components/sections/recently-added-section'
import { ToolsSection } from '@/components/sections/tools-section'
import { StaticWebsitesList } from '@/components/static-websites-list'
import { getGuides } from '@/lib/content-loader'
import { getLatestMembers } from '@/lib/members'
import { generateBaseMetadata, generateWebsiteSchema, KEYWORDS } from '@/lib/seo/seo-config'

export const metadata: Metadata = generateBaseMetadata({
  title: 'Discover AI-Ready Documentation - llms.txt hub',
  description:
    'Explore 500+ AI-friendly websites and tools implementing the llms.txt standard. Find APIs, platforms, and documentation optimized for LLM integration.',
  keywords: [...KEYWORDS.homepage, ...KEYWORDS.global],
  path: '/'
})

export default async function Home() {
  const { allProjects, featuredProjects, recentlyUpdatedProjects, totalCount } =
    await getHomePageData()
  const featuredGuides = await getGuides()
  const latestMembers = await getLatestMembers(6, false) // Skip contributions to avoid GitHub API rate limits

  // Sort projects alphabetically by name server-side
  const sortedProjects = [...allProjects].sort((a, b) => a.name.localeCompare(b.name))

  return (
    <>
      <JsonLd data={generateWebsiteSchema()} />
      <div className="w-full space-y-16">
        <HeroSection />
      </div>
      <div className="border-t">
        <div className="relative flex h-full w-full max-w-full flex-row flex-nowrap">
          <AppSidebar featuredCount={featuredProjects.length} />

          <div className="relative flex h-full w-full flex-col px-6 pt-6 pb-16 space-y-8">
            <section>
              <FeaturedProjectsSection projects={featuredProjects} />
            </section>

            {/* Recently Added Section */}
            <section>
              <RecentlyAddedSection websites={recentlyUpdatedProjects} />
            </section>

            {/* All Websites Section */}
            <section>
              <StaticWebsitesList websites={sortedProjects} totalCount={totalCount} />
            </section>

            <ToolsSection />
            <FeaturedGuidesSection guides={featuredGuides} />
            <LatestMembersSection members={latestMembers} />
            <HowItWorksSection />
            <CreatorProjectsSection />
            <NewsletterSection />
          </div>
        </div>
      </div>
    </>
  )
}
