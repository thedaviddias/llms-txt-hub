import { ArrowRight } from 'lucide-react'
import Link from 'next/link'

type SectionProps = {
  title: string
  description?: string
  children: React.ReactNode
  viewAllHref?: string
  viewAllText?: string
}

/**
 * Section wrapper component with bold title styling
 * Features: Sticky header, decorative accent dot, bold typography
 */
export function Section({
  children,
  title,
  description,
  viewAllHref,
  viewAllText = 'View all'
}: SectionProps) {
  return (
    <section className="space-y-6">
      <div className="sticky top-16 z-30 bg-background/95 backdrop-blur-sm border-b border-border/50 flex items-center justify-between py-3 sm:py-4 -mx-6 px-6">
        <div className="space-y-0.5 sm:space-y-1 flex-1">
          <h2 className="flex items-center gap-2 text-xl sm:text-2xl font-bold tracking-tight">
            <span
              className="inline-block w-1.5 h-1.5 rounded-full bg-foreground"
              aria-hidden="true"
            />
            {title}
          </h2>
          {description && (
            <p className="text-xs sm:text-sm text-muted-foreground line-clamp-2 pl-3.5">
              {description}
            </p>
          )}
        </div>
        {viewAllHref && (
          <div className="flex items-center gap-2 ml-2">
            <Link
              href={viewAllHref}
              className="group flex items-center text-sm sm:text-base font-medium whitespace-nowrap text-muted-foreground hover:text-foreground transition-colors"
              aria-label={viewAllText}
            >
              <span className="hidden sm:inline">{viewAllText}</span>
              <ArrowRight className="size-5 sm:size-4 sm:ml-2 transition-transform group-hover:translate-x-0.5" />
            </Link>
          </div>
        )}
      </div>
      {children}
    </section>
  )
}
