import { getRoute } from '@/lib/routes'
import type { Guide } from '@/types/types'
import { ArrowRight } from 'lucide-react'
import Link from 'next/link'
import { GuideCard } from './guide-card'

interface FeaturedGuidesSectionProps {
  guides: Guide[]
}

/**
 * Section component displaying featured guides
 *
 * @param props - Component props
 * @param props.guides - List of guides to display
 * @returns React component
 */
export function FeaturedGuidesSection({ guides }: FeaturedGuidesSectionProps) {
  return (
    <section className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="space-y-1">
          <h2 className="text-2xl font-semibold tracking-tight">Featured Guides</h2>
          <p className="text-sm text-muted-foreground">
            Learn how to implement and optimize llms.txt for your documentation
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Link href={getRoute('guides.list')} className="flex items-center">
            View all <ArrowRight className="ml-2 h-4 w-4" />
          </Link>
        </div>
      </div>
      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {guides.map(guide => (
          <GuideCard key={guide.slug} guide={guide} />
        ))}
      </div>
    </section>
  )
}
