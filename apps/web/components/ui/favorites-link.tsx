'use client'

import { cn } from '@thedaviddias/design-system/lib/utils'
import { Heart } from 'lucide-react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useFavorites } from '@/contexts/favorites-context'
import { getRoute } from '@/lib/routes'

interface FavoritesLinkProps {
  className?: string
  isMobile?: boolean
}

/**
 * Renders a link to the favorites page with a count badge
 */
export function FavoritesLink({ className, isMobile = false }: FavoritesLinkProps) {
  const { favorites } = useFavorites()
  const pathname = usePathname()
  const isFavoritesPage = pathname === '/favorites'

  const baseClasses = cn(
    'flex items-center justify-between gap-2 text-sm rounded-md transition-colors plausible-event-name=Favorites+Click',
    {
      'px-2 py-1': !isMobile,
      'px-2 py-1.5': isMobile,
      'text-foreground font-medium bg-accent': isFavoritesPage,
      'text-muted-foreground hover:text-foreground hover:bg-muted/50': !isFavoritesPage
    },
    className
  )

  return (
    <Link href={getRoute('favorites')} className={baseClasses}>
      <div className="flex items-center gap-2">
        <Heart className="h-4 w-4" />
        <span>Favorites</span>
      </div>
      {favorites.length > 0 && (
        <span className="text-xs bg-muted px-1.5 py-0.5 rounded-full">{favorites.length}</span>
      )}
    </Link>
  )
}
