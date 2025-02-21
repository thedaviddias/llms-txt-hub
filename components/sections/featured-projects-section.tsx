import Link from "next/link"
import { Button } from "@/components/ui/button"
import { LLMGrid } from "@/components/llm-grid"
import { ArrowRight } from "lucide-react"
import type { ProjectMetadata } from "@/lib/project-utils"

interface FeaturedProjectsSectionProps {
  projects: ProjectMetadata[]
}

export function FeaturedProjectsSection({ projects }: FeaturedProjectsSectionProps) {
  return (
    <section className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-3xl font-bold">Featured Projects</h2>
        <Button variant="ghost" asChild>
          <Link href="/projects?filter=featured">
            View all <ArrowRight className="ml-2 h-4 w-4" />
          </Link>
        </Button>
      </div>
      <LLMGrid items={projects} />
    </section>
  )
}

