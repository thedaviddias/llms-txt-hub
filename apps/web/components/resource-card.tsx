import { formatDate } from '@/lib/utils'
import { Badge } from '@thedaviddias/design-system/badge'
import { Card } from '@thedaviddias/design-system/card'
import { ExternalLink } from 'lucide-react'
import Link from 'next/link'

interface ResourceCardProps {
  resource: {
    slug: string
    title: string
    description: string
    url: string
    date: string
    type: string
    source: string
    tags?: string[]
  }
}

export function ResourceCard({ resource }: ResourceCardProps) {
  return (
    <Card className="p-6">
      <article className="space-y-4">
        <div className="flex items-center justify-between">
          <Badge variant="secondary">{resource.type}</Badge>
          <time className="text-sm text-muted-foreground" dateTime={resource.date}>
            {formatDate(resource.date)}
          </time>
        </div>
        <h3 className="text-xl font-bold">
          <Link href={resource.url} className="hover:underline" target="_blank">
            {resource.title}
            <ExternalLink className="inline-block ml-2 h-4 w-4" />
          </Link>
        </h3>
        <p className="text-muted-foreground">{resource.description}</p>
        <div className="flex items-center gap-2">
          <Badge variant="outline">{resource.source}</Badge>
          {resource.tags?.map(tag => (
            <Badge key={tag} variant="secondary">
              {tag}
            </Badge>
          ))}
        </div>
      </article>
    </Card>
  )
}
