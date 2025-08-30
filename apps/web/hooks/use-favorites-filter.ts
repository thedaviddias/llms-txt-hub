'use client'

import { useFavorites } from '@/contexts/favorites-context'
import type { WebsiteMetadata } from '@/lib/content-loader'
import { useMemo } from 'react'

export function useFavoritesFilter(websites: WebsiteMetadata[]) {
  const { favorites } = useFavorites()

  const favoriteWebsites = useMemo(() => {
    return websites.filter(website => favorites.includes(website.slug))
  }, [websites, favorites])

  return {
    favoriteWebsites,
    hasFavorites: favorites.length > 0,
    favoritesCount: favorites.length
  }
}
