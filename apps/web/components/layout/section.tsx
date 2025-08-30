import { ArrowRight } from 'lucide-react'
import Link from 'next/link'

type SectionProps = {
  title: string
  description?: string
  children: React.ReactNode
  viewAllHref?: string
  viewAllText?: string
}

export function Section({
  children,
  title,
  description,
  viewAllHref,
  viewAllText = 'View all'
}: SectionProps) {
  return (
    <section className="space-y-6">
      <div className="sticky top-16 z-30 bg-background border-b flex items-center justify-between py-3 sm:py-4 -mx-6 px-6">
        <div className="space-y-0.5 sm:space-y-1 flex-1">
          <h2 className="text-xl sm:text-2xl font-semibold tracking-tight">{title}</h2>
          {description && (
            <p className="text-xs sm:text-sm text-muted-foreground line-clamp-2">{description}</p>
          )}
        </div>
        {viewAllHref && (
          <div className="flex items-center gap-2 ml-2">
            <Link
              href={viewAllHref}
              className="flex items-center text-sm sm:text-base whitespace-nowrap"
              aria-label={viewAllText}
            >
              <span className="hidden sm:inline">{viewAllText}</span>
              <ArrowRight className="size-5 sm:size-4 sm:ml-2" />
            </Link>
          </div>
        )}
      </div>
      {children}
    </section>
  )
}
