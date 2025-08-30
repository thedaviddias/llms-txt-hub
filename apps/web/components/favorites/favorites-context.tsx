'use client'

import {
  getFavoritesFromStorage,
  saveFavoritesToStorage,
  toggleFavorite as toggleFavoriteLogic
} from '@/lib/favorites'
import { useAuth } from '@thedaviddias/auth'
import { logger } from '@thedaviddias/logging'
import { createContext, useCallback, useContext, useEffect, useState } from 'react'

interface FavoritesContextType {
  favorites: Set<string>
  favoritesCount: number
  isFavorite: (slug: string) => boolean
  toggleFavorite: (slug: string) => void
  isLoading: boolean
}

const FavoritesContext = createContext<FavoritesContextType | undefined>(undefined)

export function FavoritesProvider({ children }: { children: React.ReactNode }) {
  const [favorites, setFavorites] = useState<Set<string>>(new Set())
  const [isLoading, setIsLoading] = useState(true)
  const { user } = useAuth()

  // Initialize favorites from localStorage on mount
  useEffect(() => {
    const storedFavorites = getFavoritesFromStorage()
    setFavorites(new Set(storedFavorites))
    setIsLoading(false)
  }, [])

  // Sync with user profile when user changes
  useEffect(() => {
    if (!user) return

    const syncWithProfile = async () => {
      try {
        // TODO: Implement user profile sync
        // For now, we rely on localStorage as the primary storage
        logger.info('User profile sync not implemented yet')
      } catch (error) {
        logger.error('Failed to sync with user profile:', {
          data: error,
          tags: { type: 'component' }
        })
      }
    }

    syncWithProfile()
  }, [user])

  const isFavorite = useCallback((slug: string) => favorites.has(slug), [favorites])

  const toggleFavorite = useCallback(
    (slug: string) => {
      setFavorites(prev => {
        const current = Array.from(prev)
        const updated = toggleFavoriteLogic(slug, current)
        const newSet = new Set(updated)

        // Save to localStorage
        saveFavoritesToStorage(updated)

        // If user is logged in, update their profile
        if (user) {
          // TODO: Update user profile
          // This would require calling a server action or API route
        }

        return newSet
      })
    },
    [user]
  )

  return (
    <FavoritesContext.Provider
      value={{
        favorites,
        favoritesCount: favorites.size,
        isFavorite,
        toggleFavorite,
        isLoading
      }}
    >
      {children}
    </FavoritesContext.Provider>
  )
}

export function useFavorites() {
  const context = useContext(FavoritesContext)
  if (context === undefined) {
    throw new Error('useFavorites must be used within a FavoritesProvider')
  }
  return context
}
