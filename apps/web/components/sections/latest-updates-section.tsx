import Link from "next/link"
import { Button } from "@/components/ui/button"
import { LLMGrid } from "@/components/llm-grid"
import { ArrowRight, Clock } from "lucide-react"
import type { ProjectMetadata } from "@/lib/project-utils"

interface LatestUpdatesSectionProps {
  projects: ProjectMetadata[]
}

export function LatestUpdatesSection({ projects }: LatestUpdatesSectionProps) {
  return (
    <section className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold flex items-center gap-2">
          <Clock className="h-6 w-6" />
          Latest Updates
        </h2>
        <Button variant="ghost" asChild>
          <Link href="/projects?filter=latest">
            View all <ArrowRight className="ml-2 h-4 w-4" />
          </Link>
        </Button>
      </div>
      <LLMGrid items={projects} variant="compact" />
    </section>
  )
}

