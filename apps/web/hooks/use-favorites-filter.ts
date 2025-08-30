'use client'

import { useFavorites } from '@/contexts/favorites-context'
import type { WebsiteMetadata } from '@/lib/content-loader'
import { useMemo } from 'react'

/**
 * Filters a list of websites to those marked as favorites and exposes simple favorite metadata.
 *
 * Returns the subset of `websites` whose `slug` appears in the favorites list from context, along with
 * a boolean indicating whether any favorites exist and the total favorites count.
 *
 * @param websites - Array of website metadata to filter (each item must have a `slug`).
 * @returns An object with:
 *  - `favoriteWebsites`: WebsiteMetadata[] filtered to favorites.
 *  - `hasFavorites`: `true` when there is at least one favorite.
 *  - `favoritesCount`: number of favorites.
 */
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
