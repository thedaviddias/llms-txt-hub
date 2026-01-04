import { Badge } from '@thedaviddias/design-system/badge'
import { Book, GraduationCap } from 'lucide-react'
import Image from 'next/image'
import Link from 'next/link'
import { Card, CardContent } from '@/components/ui/card'
import { getRoute } from '@/lib/routes'
import type { Guide } from '@/types/types'

interface GuideCardProps {
  guide: Guide
  index?: number
}

/**
 * Returns a CSS class based on the difficulty level
 *
 * @param difficulty - The difficulty level of the guide
 * @returns CSS class string for styling the difficulty badge
 */
function getDifficultyColor(difficulty: Guide['difficulty']) {
  switch (difficulty) {
    case 'beginner':
      return 'bg-green-500/10 text-green-500 dark:bg-green-500/20'
    case 'intermediate':
      return 'bg-blue-500/10 text-blue-500 dark:bg-blue-500/20'
    case 'advanced':
      return 'bg-purple-500/10 text-purple-500 dark:bg-purple-500/20'
    default:
      return 'bg-gray-500/10 text-gray-500 dark:bg-gray-500/20'
  }
}

/**
 * Card component for displaying a guide
 *
 * @param props - Component props
 * @param props.guide - The guide to display
 * @param props.index - Optional index for staggered animations
 * @returns React component
 */
export function GuideCard({ guide, index = 0 }: GuideCardProps) {
  return (
    <Card
      className="p-0 gap-0 transition-all hover:border-primary hover:bg-muted/50 relative overflow-hidden animate-fade-in-up group"
      style={{ animationDelay: `${(index + 1) * 50}ms` }}
    >
      {guide.image && (
        <div className="relative aspect-video w-full overflow-hidden">
          <Image
            src={guide.image}
            alt={guide.title}
            fill
            className="object-cover transition-transform duration-300 group-hover:scale-105"
          />
        </div>
      )}
      <CardContent className="p-4 space-y-2">
        <div className="flex items-center gap-1.5">
          <Badge variant="secondary" className={getDifficultyColor(guide.difficulty)}>
            {guide.difficulty}
          </Badge>
        </div>
        <div className="space-y-1">
          <h3 className="font-semibold text-sm sm:text-base line-clamp-2">
            <Link
              href={getRoute('guides.guide', { slug: guide.slug })}
              className="block after:absolute after:inset-0 after:content-[''] z-10 hover:text-primary transition-colors"
            >
              {guide.title}
            </Link>
          </h3>
          <p className="text-xs sm:text-sm text-muted-foreground line-clamp-2">
            {guide.description}
          </p>
        </div>
        <div className="flex items-center gap-1.5">
          {guide.category === 'getting-started' && (
            <Book className="size-4 text-muted-foreground" />
          )}
          {guide.category === 'implementation' && (
            <GraduationCap className="size-4 text-muted-foreground" />
          )}
          <span className="text-xs text-muted-foreground capitalize">
            {guide.category.replace('-', ' ')}
          </span>
        </div>
      </CardContent>
    </Card>
  )
}
