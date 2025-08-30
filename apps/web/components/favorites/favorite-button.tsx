'use client'

import { cn } from '@thedaviddias/design-system/lib/utils'
import { Heart } from 'lucide-react'
import { useState } from 'react'
import { useFavorites } from './favorites-context'

interface FavoriteButtonProps {
  websiteSlug: string
  websiteName: string
  className?: string
}

/**
 * Button component for adding/removing favorites
 */
export function FavoriteButton({ websiteSlug, websiteName, className }: FavoriteButtonProps) {
  const { isFavorite, toggleFavorite } = useFavorites()
  const [isAnimating, setIsAnimating] = useState(false)
  const favorited = isFavorite(websiteSlug)

  /**
   * Handles favorite button click
   */
  const handleClick = (e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()

    setIsAnimating(true)
    toggleFavorite(websiteSlug)

    // Reset animation state
    setTimeout(() => setIsAnimating(false), 300)
  }

  return (
    <button
      type="button"
      onClick={handleClick}
      className={cn(
        'p-2 rounded-full transition-all duration-200 hover:bg-muted/80 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2',
        isAnimating && 'scale-110',
        className
      )}
      aria-label={
        favorited ? `Remove ${websiteName} from favorites` : `Add ${websiteName} to favorites`
      }
    >
      <Heart
        className={cn(
          'h-5 w-5 transition-all duration-200',
          favorited ? 'fill-red-500 text-red-500' : 'text-muted-foreground hover:text-foreground'
        )}
      />
    </button>
  )
}
