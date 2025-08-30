// Core favorites management logic
import { logger } from '@thedaviddias/logging'

export const FAVORITES_STORAGE_KEY = 'llms-hub-favorites'
export const FAVORITES_VERSION = 1

export interface FavoritesData {
  favorites: string[]
  lastUpdated: string
  version: number
}

export function getFavoritesFromStorage(): string[] {
  if (typeof window === 'undefined') return []

  try {
    const stored = localStorage.getItem(FAVORITES_STORAGE_KEY)
    if (!stored) return []

    const data: FavoritesData = JSON.parse(stored)
    // Handle version migrations here if needed
    return data.favorites || []
  } catch (error) {
    logger.error('Error reading favorites from storage:', {
      data: error,
      tags: { type: 'library' }
    })
    return []
  }
}

export function saveFavoritesToStorage(favorites: string[]): void {
  if (typeof window === 'undefined') return

  try {
    const data: FavoritesData = {
      favorites,
      lastUpdated: new Date().toISOString(),
      version: FAVORITES_VERSION
    }
    localStorage.setItem(FAVORITES_STORAGE_KEY, JSON.stringify(data))
  } catch (error) {
    logger.error('Error saving favorites to storage:', { data: error, tags: { type: 'library' } })
  }
}

export function toggleFavorite(slug: string, currentFavorites: string[]): string[] {
  const index = currentFavorites.indexOf(slug)
  if (index > -1) {
    // Remove from favorites
    return currentFavorites.filter(s => s !== slug)
  } else {
    // Add to favorites
    return [...currentFavorites, slug]
  }
}

// Merge favorites from different sources (for sync logic)
export function mergeFavorites(local: string[], remote: string[]): string[] {
  const merged = new Set([...local, ...remote])
  return Array.from(merged)
}
