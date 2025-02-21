import { getRoute } from '@/lib/routes'
import { Skeleton } from '@thedaviddias/design-system/skeleton'
import { ChevronRight } from 'lucide-react'
import Link from 'next/link'

export default function Loading() {
  return (
    <div className="container mx-auto px-4 py-8">
      <div className="max-w-[1200px] mx-auto space-y-8">
        {/* Breadcrumb */}
        <nav className="flex items-center gap-2 text-sm text-muted-foreground">
          <Link href={getRoute('home')} className="hover:text-foreground">
            Home
          </Link>
          <ChevronRight className="h-4 w-4" />
          <Link href={getRoute('category.list')} className="hover:text-foreground">
            Categories
          </Link>
          <ChevronRight className="h-4 w-4" />
          <Skeleton className="h-4 w-24" />
        </nav>

        <div className="space-y-4">
          <div className="flex items-center gap-3">
            <Skeleton className="h-8 w-8" />
            <Skeleton className="h-9 w-48" />
          </div>
          <Skeleton className="h-6 w-full max-w-2xl" />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <Skeleton key={i} className="h-[200px] rounded-lg" />
          ))}
        </div>
      </div>
    </div>
  )
}
