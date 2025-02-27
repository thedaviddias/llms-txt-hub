import { format } from 'date-fns'
import Link from 'next/link'

interface GuideHeaderProps {
  title: string
  description: string
  date: string
  authors: Array<{
    name: string
    url?: string
  }>
  category?: string
}

export function GuideHeader({ title, description, date, authors, category }: GuideHeaderProps) {
  return (
    <div className="space-y-4">
      <div className="flex items-center space-x-2 text-sm text-muted-foreground">
        <time dateTime={date}>{format(new Date(date), 'MMMM dd, yyyy')}</time>
        <span>•</span>
        <div className="flex items-center space-x-1">
          {authors.map((author, index) => (
            <span key={author.name}>
              {author.url ? (
                <Link
                  href={author.url}
                  className="hover:underline"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  {author.name}
                </Link>
              ) : (
                author.name
              )}
              {index < authors.length - 1 && ', '}
            </span>
          ))}
        </div>
      </div>
    </div>
  )
}
