'use client'

import { useFavorites } from '@/contexts/favorites-context'
import { useAuth } from '@thedaviddias/auth'
import { cn } from '@thedaviddias/design-system/lib/utils'
import { Heart } from 'lucide-react'
import { useState } from 'react'

interface FavoriteButtonProps {
  slug: string
  className?: string
  size?: 'sm' | 'md' | 'lg'
  variant?: 'default' | 'ghost'
}

export function FavoriteButton({
  slug,
  className,
  size = 'md',
  variant = 'default'
}: FavoriteButtonProps) {
  const { isFavorite, toggleFavorite } = useFavorites()
  const { user } = useAuth()
  const [isAnimating, setIsAnimating] = useState(false)

  const favorited = isFavorite(slug)

  const handleClick = (e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()

    setIsAnimating(true)

    // Always allow favorites (localStorage for anonymous users)
    toggleFavorite(slug)

    // Reset animation state
    setTimeout(() => setIsAnimating(false), 200)
  }

  const sizeClasses = {
    sm: 'h-8 w-8',
    md: 'h-10 w-10',
    lg: 'h-12 w-12'
  }

  const iconSizeClasses = {
    sm: 'h-5 w-5',
    md: 'h-6 w-6',
    lg: 'h-7 w-7'
  }

  const baseClasses = cn(
    'relative flex items-center justify-center rounded-full transition-all duration-200 z-20 cursor-pointer group',
    'hover:scale-110 will-change-transform transform-gpu',
    'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2',
    sizeClasses[size],
    {
      'bg-background border shadow-sm': variant === 'default',
      'hover:bg-muted/50': variant === 'ghost'
    },
    variant === 'default' &&
      (favorited
        ? 'border-red-500 hover:border-red-600 dark:border-red-400 dark:hover:border-red-500'
        : 'border-border hover:border-red-200 dark:hover:border-red-800'),
    className
  )

  return (
    <button
      type="button"
      onClick={handleClick}
      className={baseClasses}
      aria-label={favorited ? 'Remove from favorites' : 'Add to favorites'}
      title={
        favorited
          ? 'Remove from favorites'
          : user
            ? 'Add to favorites'
            : 'Add to favorites (save locally)'
      }
    >
      <Heart
        className={cn(
          'transition-all duration-200 antialiased',
          iconSizeClasses[size],
          favorited
            ? 'fill-red-500 text-red-500 dark:fill-red-400 dark:text-red-400'
            : 'text-muted-foreground group-hover:text-red-400 dark:group-hover:text-red-500',
          isAnimating && 'scale-125'
        )}
        style={{
          shapeRendering: 'auto',
          vectorEffect: 'non-scaling-stroke'
        }}
      />
    </button>
  )
}
