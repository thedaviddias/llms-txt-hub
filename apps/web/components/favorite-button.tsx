'use client'

import { favoriteProject } from '@/app/actions'
import { cn } from '@/lib/utils'
import { useAuth } from '@thedaviddias/auth'
import { Button } from '@thedaviddias/design-system/button'
import { useToast } from '@thedaviddias/design-system/use-toast'
import { Star } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { useState } from 'react'

interface FavoriteButtonProps {
  projectSlug: string
  initialFavorites: number
  showText?: boolean
  className?: string
}

export function FavoriteButton({
  projectSlug,
  initialFavorites,
  showText = false,
  className
}: FavoriteButtonProps) {
  const [favorites, setFavorites] = useState(initialFavorites)
  const { toast } = useToast()
  const { user } = useAuth()
  const router = useRouter()

  const handleFavorite = async () => {
    if (!user) {
      const currentPath = window.location.pathname
      router.push(`/login?redirectTo=${encodeURIComponent(currentPath)}`)
      return
    }

    try {
      const formData = new FormData()
      formData.append('projectSlug', projectSlug)

      const result = await favoriteProject(formData)

      if (result.success) {
        setFavorites(result.newFavoriteCount)
        toast({
          title: 'Project favorited',
          description: 'Thank you for your support!'
        })
      } else {
        throw new Error(result.error)
      }
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to favorite project. Please try again.',
        variant: 'destructive'
      })
    }
  }

  return (
    <Button onClick={handleFavorite} variant="ghost" size="sm" className={cn('gap-2', className)}>
      <Star className="h-4 w-4" />
      {showText && (
        <span className="text-sm">
          {favorites} {favorites === 1 ? 'Favorite' : 'Favorites'}
        </span>
      )}
      {!showText && <span className="sr-only">Favorite ({favorites})</span>}
    </Button>
  )
}
