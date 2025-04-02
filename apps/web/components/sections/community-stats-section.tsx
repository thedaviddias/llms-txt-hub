import { GitHubStarsCard } from '@/components/stats/github-stars-card'
import { StatCard } from '@/components/stats/stat-card'
import type { WebsiteMetadata } from '@/lib/content-loader'
import { FileCheck, FileText } from 'lucide-react'
import { Section } from '../layout/section'

interface CommunityStatsSectionProps {
  allProjects: WebsiteMetadata[]
}

/**
 * Displays community statistics about llms.txt implementation and engagement
 *
 * @param props - Component props
 * @param props.allProjects - Array of website metadata for statistics calculation
 *
 * @returns React component displaying community statistics
 *
 * @example
 * ```tsx
 * <CommunityStatsSection allProjects={projects} />
 * ```
 */
export function CommunityStatsSection({ allProjects }: CommunityStatsSectionProps) {
  const basicImplementations = allProjects.filter(p => p.llmsUrl).length
  const enhancedImplementations = allProjects.filter(p => p.llmsFullUrl).length

  return (
    <Section title="Community Stats" description="Discover the impact of the llms.txt community">
      <div className="grid md:grid-cols-3 gap-4 md:gap-8">
        <GitHubStarsCard />
        <StatCard
          title="llms.txt files"
          value={basicImplementations}
          icon={FileText}
          description="Websites with basic AI-friendly documentation structure"
        />
        <StatCard
          title="llms-full.txt files"
          value={enhancedImplementations}
          icon={FileCheck}
          description="Websites with extended AI documentation features"
        />
      </div>
    </Section>
  )
}
