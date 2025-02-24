import { StatCard } from '@/components/stats/stat-card'
import type { WebsiteMetadata } from '@/lib/mdx'
import { FileCheck, Globe } from 'lucide-react'

interface CommunityStatsSectionProps {
  allProjects: WebsiteMetadata[]
}

export function CommunityStatsSection({ allProjects }: CommunityStatsSectionProps) {
  return (
    <section className="space-y-6">
      <h2 className="text-2xl font-bold text-center">Community Stats</h2>
      <div className="grid md:grid-cols-2 gap-8">
        <StatCard title="Indexed Websites" value={allProjects.length} icon={Globe} />
        <StatCard
          title="AI-Ready Docs"
          value={allProjects.filter(p => p.llmsUrl && p.llmsFullUrl).length}
          icon={FileCheck}
        />
      </div>
    </section>
  )
}
