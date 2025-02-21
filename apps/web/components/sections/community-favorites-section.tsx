import { LLMGrid } from '@/components/llm-grid'
import type { ProjectMetadata } from '@/lib/project-utils'
import { Button } from '@thedaviddias/design-system/button'
import { ArrowRight, Star } from 'lucide-react'
import Link from 'next/link'

interface CommunityFavoritesSectionProps {
  projects: ProjectMetadata[]
}

export function CommunityFavoritesSection({ projects }: CommunityFavoritesSectionProps) {
  return (
    <section className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold flex items-center gap-2">
          <Star className="h-6 w-6" />
          Community Favorites
        </h2>
        <Button variant="ghost" asChild>
          <Link href="/projects?filter=favorites">
            View all <ArrowRight className="ml-2 h-4 w-4" />
          </Link>
        </Button>
      </div>
      <LLMGrid items={projects} variant="compact" />
    </section>
  )
}
