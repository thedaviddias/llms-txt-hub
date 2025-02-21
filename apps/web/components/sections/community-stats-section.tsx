import { StatCard } from "@/components/stat-card"
import { Globe, FileCheck, Star } from "lucide-react"
import type { ProjectMetadata } from "@/lib/project-utils"

interface CommunityStatsSectionProps {
  allProjects: ProjectMetadata[]
}

export function CommunityStatsSection({ allProjects }: CommunityStatsSectionProps) {
  return (
    <section className="space-y-6">
      <h2 className="text-3xl font-bold text-center">Community Stats</h2>
      <div className="grid md:grid-cols-3 gap-8">
        <StatCard title="Indexed Websites" value={allProjects.length} icon={Globe} />
        <StatCard
          title="AI-Ready Docs"
          value={allProjects.filter((p) => p.llmsUrl && p.llmsFullUrl).length}
          icon={FileCheck}
        />
        <StatCard
          title="Community Favorites"
          value={allProjects.reduce((sum, project) => sum + project.favorites, 0)}
          icon={Star}
        />
      </div>
    </section>
  )
}

