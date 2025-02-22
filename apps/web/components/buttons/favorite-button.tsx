'use client'

import type React from 'react'

import { favoriteProject } from '@/app/actions'
import { useAuth } from '@thedaviddias/auth'
import { Button } from '@thedaviddias/design-system/button'
import { useToast } from '@thedaviddias/design-system/use-toast'
import { Heart } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { useState } from 'react'

interface FavoriteButtonProps {
  projectSlug: string
  initialFavorites: number
}

export function FavoriteButton({ projectSlug, initialFavorites }: FavoriteButtonProps) {
  const [favorites, setFavorites] = useState(initialFavorites)
  const { user } = useAuth()
  const { toast } = useToast()
  const router = useRouter()

  const handleFavorite = async (e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()

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
    <Button
      variant="ghost"
      size="sm"
      onClick={handleFavorite}
      className="z-20 relative hover:bg-background/80"
    >
      <Heart className="h-4 w-4 mr-1" />
      <span>{Number.isNaN(favorites) ? '0' : favorites.toString()}</span>
    </Button>
  )
}
