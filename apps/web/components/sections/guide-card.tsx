import { getRoute } from '@/lib/routes'
import type { Guide } from '@/types/types'
import { Badge } from '@thedaviddias/design-system/badge'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle
} from '@thedaviddias/design-system/card'
import { Book, GraduationCap } from 'lucide-react'
import Link from 'next/link'

interface GuideCardProps {
  guide: Guide
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
 * @returns React component
 */
export function GuideCard({ guide }: GuideCardProps) {
  return (
    <Card className="flex flex-col hover:bg-muted/50 transition-colors relative">
      <CardHeader>
        <div className="flex items-center gap-2">
          <Badge variant="secondary" className={getDifficultyColor(guide.difficulty)}>
            {guide.difficulty}
          </Badge>
        </div>
        <CardTitle className="line-clamp-2 mt-2">
          <Link
            href={getRoute('guides.guide', { slug: guide.slug })}
            className="leading-6 block after:absolute after:inset-0 after:content-[''] z-10"
          >
            {guide.title}
          </Link>
        </CardTitle>
        <CardDescription className="line-clamp-2 mt-2">{guide.description}</CardDescription>
      </CardHeader>
      <CardContent className="flex-1">
        <div className="flex items-center gap-2">
          {guide.category === 'getting-started' && <Book className="h-4 w-4 text-primary" />}
          {guide.category === 'implementation' && (
            <GraduationCap className="h-4 w-4 text-primary" />
          )}
          <span className="text-sm text-muted-foreground capitalize">
            {guide.category.replace('-', ' ')}
          </span>
        </div>
      </CardContent>
    </Card>
  )
}
