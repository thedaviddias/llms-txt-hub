'use client'

import { useAuth } from '@thedaviddias/auth'
import { logger } from '@thedaviddias/logging'
import { type ReactNode, createContext, useCallback, useContext, useEffect, useState } from 'react'

export interface FavoritesContextValue {
  favorites: string[]
  isFavorite: (slug: string) => boolean
  addFavorite: (slug: string) => void
  removeFavorite: (slug: string) => void
  toggleFavorite: (slug: string) => void
  isLoading: boolean
}

const FavoritesContext = createContext<FavoritesContextValue | null>(null)

const STORAGE_KEY = 'llms-txt-hub-favorites'

interface FavoritesProviderProps {
  children: ReactNode
}

export function FavoritesProvider({ children }: FavoritesProviderProps) {
  const [favorites, setFavorites] = useState<string[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const { user, isSignedIn } = useAuth()

  // Load favorites from localStorage on mount (client-side only)
  useEffect(() => {
    if (typeof window === 'undefined') return

    try {
      const stored = localStorage.getItem(STORAGE_KEY)
      if (stored) {
        const parsed = JSON.parse(stored)
        if (Array.isArray(parsed)) {
          setFavorites(parsed)
        }
      }
    } catch (error) {
      logger.error('Failed to load favorites from localStorage', {
        data: error,
        tags: { context: 'favorites' }
      })
    } finally {
      setIsLoading(false)
    }
  }, [])

  // Sync with secure user favorites API when user changes
  useEffect(() => {
    if (!isSignedIn || !user) return

    const syncUserFavorites = async () => {
      try {
        const response = await fetch('/api/user/favorites')
        if (response.ok) {
          const { favorites: userFavorites } = await response.json()
          if (Array.isArray(userFavorites)) {
            // Merge localStorage favorites with user favorites
            const localFavorites = favorites
            const mergedFavorites = Array.from(new Set([...localFavorites, ...userFavorites]))

            if (
              mergedFavorites.length !== favorites.length ||
              !mergedFavorites.every(fav => favorites.includes(fav))
            ) {
              setFavorites(mergedFavorites)
              // Update localStorage with merged favorites
              localStorage.setItem(STORAGE_KEY, JSON.stringify(mergedFavorites))

              // If there were local changes, sync back to server
              if (mergedFavorites.length !== userFavorites.length) {
                await updateUserFavorites(mergedFavorites)
              }
            }
          }
        }
      } catch (error) {
        logger.error('Failed to sync user favorites', {
          data: error,
          tags: { context: 'favorites' }
        })
      }
    }

    syncUserFavorites()
  }, [isSignedIn, user]) // Remove favorites from dependency to avoid infinite loop

  // Save favorites to localStorage
  const saveFavoritesToStorage = useCallback((newFavorites: string[]) => {
    if (typeof window === 'undefined') return

    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(newFavorites))
    } catch (error) {
      logger.error('Failed to save favorites to localStorage', {
        data: error,
        tags: { context: 'favorites' }
      })
    }
  }, [])

  // Update user favorites via secure API
  const updateUserFavorites = useCallback(
    async (newFavorites: string[]) => {
      if (!isSignedIn || !user) return

      try {
        const response = await fetch('/api/user/favorites', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({ favorites: newFavorites })
        })

        if (!response.ok) {
          throw new Error('Failed to update favorites')
        }
      } catch (error) {
        logger.error('Failed to update user favorites', {
          data: error,
          tags: { context: 'favorites' }
        })
      }
    },
    [isSignedIn, user]
  )

  const isFavorite = useCallback(
    (slug: string): boolean => {
      return favorites.includes(slug)
    },
    [favorites]
  )

  const addFavorite = useCallback(
    (slug: string) => {
      if (!favorites.includes(slug)) {
        const newFavorites = [...favorites, slug]
        setFavorites(newFavorites)
        saveFavoritesToStorage(newFavorites)
        // Only sync to server if user is logged in
        if (isSignedIn && user) {
          updateUserFavorites(newFavorites)
        }
      }
    },
    [favorites, saveFavoritesToStorage, updateUserFavorites, isSignedIn, user]
  )

  const removeFavorite = useCallback(
    (slug: string) => {
      if (favorites.includes(slug)) {
        const newFavorites = favorites.filter(fav => fav !== slug)
        setFavorites(newFavorites)
        saveFavoritesToStorage(newFavorites)
        // Only sync to server if user is logged in
        if (isSignedIn && user) {
          updateUserFavorites(newFavorites)
        }
      }
    },
    [favorites, saveFavoritesToStorage, updateUserFavorites, isSignedIn, user]
  )

  const toggleFavorite = useCallback(
    (slug: string) => {
      if (favorites.includes(slug)) {
        removeFavorite(slug)
      } else {
        addFavorite(slug)
      }
    },
    [favorites, addFavorite, removeFavorite]
  )

  const value: FavoritesContextValue = {
    favorites,
    isFavorite,
    addFavorite,
    removeFavorite,
    toggleFavorite,
    isLoading
  }

  return <FavoritesContext.Provider value={value}>{children}</FavoritesContext.Provider>
}

export function useFavorites() {
  const context = useContext(FavoritesContext)
  if (!context) {
    throw new Error('useFavorites must be used within a FavoritesProvider')
  }
  return context
}
