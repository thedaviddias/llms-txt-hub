'use client'

import { useAnalyticsEvents } from '@/components/analytics-tracker'
import { categories } from '@/lib/categories'
import { getRoute } from '@/lib/routes'
import { cn } from '@thedaviddias/design-system/lib/utils'
import { logger } from '@thedaviddias/logging'
import { ArrowRight, Clock, Search, TrendingUp } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { useCallback, useEffect, useRef, useState } from 'react'
import { Favicon } from './favicon'

interface SearchSuggestion {
  type: 'website' | 'category' | 'recent' | 'trending'
  title: string
  description?: string
  url?: string
  category?: string
  website?: string
  icon?: React.ComponentType<{ className?: string }>
}

interface SearchAutocompleteProps {
  searchQuery: string
  onSelect?: (suggestion: SearchSuggestion) => void
  isOpen: boolean
  onClose: () => void
  anchorRef?: React.RefObject<HTMLInputElement | null>
}

export function SearchAutocomplete({
  searchQuery,
  onSelect,
  isOpen,
  onClose,
  anchorRef
}: SearchAutocompleteProps) {
  const [suggestions, setSuggestions] = useState<SearchSuggestion[]>([])
  const [selectedIndex, setSelectedIndex] = useState(-1)
  const [loading, setLoading] = useState(false)
  const router = useRouter()
  const dropdownRef = useRef<HTMLDivElement>(null)
  const { trackSearch, trackSearchAutocomplete } = useAnalyticsEvents()

  // Get recent searches from localStorage
  const getRecentSearches = useCallback((): string[] => {
    if (typeof window === 'undefined') return []
    const recent = localStorage.getItem('recentSearches')
    return recent ? JSON.parse(recent).slice(0, 3) : []
  }, [])

  // Save search to recent searches
  const saveRecentSearch = useCallback(
    (query: string) => {
      if (typeof window === 'undefined') return
      const recent = getRecentSearches()
      const updated = [query, ...recent.filter(s => s !== query)].slice(0, 5)
      localStorage.setItem('recentSearches', JSON.stringify(updated))
    },
    [getRecentSearches]
  )

  // Fetch suggestions based on query
  useEffect(() => {
    const fetchSuggestions = async () => {
      if (!searchQuery.trim()) {
        // Show recent searches and trending when no query
        const recentSearches = getRecentSearches().map(search => ({
          type: 'recent' as const,
          title: search,
          icon: Clock
        }))

        // Show category suggestions
        const categoryMatches = categories.slice(0, 3).map(cat => ({
          type: 'category' as const,
          title: `Browse ${cat.name}`,
          description: `View all ${cat.name.toLowerCase()} websites`,
          icon: cat.icon,
          url: getRoute('category.page', { category: cat.slug })
        }))

        setSuggestions([...recentSearches, ...categoryMatches])
        setSelectedIndex(-1)
        return
      }

      setLoading(true)
      try {
        // Fetch search index
        const response = await fetch('/search/search-index.json')
        if (!response.ok) throw new Error('Failed to fetch search index')

        const searchIndex = await response.json()
        const query = searchQuery.toLowerCase()

        // Filter and rank results
        const websiteMatches = searchIndex
          .filter((item: any) => {
            const searchableText = `${item.name} ${item.description} ${item.category}`.toLowerCase()
            return searchableText.includes(query)
          })
          .slice(0, 5)
          .map((item: any) => ({
            type: 'website' as const,
            title: item.name,
            description: item.description,
            url: getRoute('website.detail', { slug: item.slug }),
            category: item.category,
            website: item.website
          }))

        // Check for category matches
        const categoryMatches = categories
          .filter(cat => cat.name.toLowerCase().includes(query) || cat.slug.includes(query))
          .slice(0, 2)
          .map(cat => ({
            type: 'category' as const,
            title: `Browse ${cat.name}`,
            description: `View all ${cat.name.toLowerCase()} websites`,
            icon: cat.icon,
            url: getRoute('category.page', { category: cat.slug })
          }))

        setSuggestions([...websiteMatches, ...categoryMatches])
        setSelectedIndex(-1)
      } catch (error) {
        logger.error('Error fetching suggestions:', { data: error, tags: { type: 'component' } })
        setSuggestions([])
      } finally {
        setLoading(false)
      }
    }

    const debounceTimer = setTimeout(fetchSuggestions, 150)
    return () => clearTimeout(debounceTimer)
  }, [searchQuery, getRecentSearches])

  // Handle keyboard navigation
  useEffect(() => {
    if (!isOpen) return

    const handleKeyDown = (e: KeyboardEvent) => {
      switch (e.key) {
        case 'ArrowDown':
          e.preventDefault()
          setSelectedIndex(prev => (prev < suggestions.length - 1 ? prev + 1 : 0))
          break
        case 'ArrowUp':
          e.preventDefault()
          setSelectedIndex(prev => (prev > 0 ? prev - 1 : suggestions.length - 1))
          break
        case 'Enter':
          e.preventDefault()
          if (selectedIndex >= 0 && suggestions[selectedIndex]) {
            handleSuggestionClick(suggestions[selectedIndex])
          } else if (searchQuery.trim()) {
            // Perform regular search via keyboard
            trackSearch(searchQuery, 0, 'autocomplete-keyboard-enter')
            saveRecentSearch(searchQuery)
            router.push(`${getRoute('search')}?q=${encodeURIComponent(searchQuery)}`)
            onClose()
          }
          break
        case 'Escape':
          e.preventDefault()
          onClose()
          break
      }
    }

    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [isOpen, selectedIndex, suggestions, searchQuery, router, onClose, saveRecentSearch])

  // Handle clicking outside
  useEffect(() => {
    if (!isOpen) return

    const handleClickOutside = (e: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(e.target as Node) &&
        anchorRef?.current &&
        !anchorRef.current.contains(e.target as Node)
      ) {
        onClose()
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [isOpen, onClose, anchorRef])

  const handleSuggestionClick = (suggestion: SearchSuggestion) => {
    // Track autocomplete selection
    trackSearchAutocomplete(searchQuery, suggestion.title, `autocomplete-${suggestion.type}`)

    if (suggestion.type === 'recent') {
      saveRecentSearch(suggestion.title)
      // Track search from recent
      trackSearch(suggestion.title, 0, 'autocomplete-recent')
      router.push(`${getRoute('search')}?q=${encodeURIComponent(suggestion.title)}`)
    } else if (suggestion.url) {
      router.push(suggestion.url)
    }

    if (onSelect) {
      onSelect(suggestion)
    }
    onClose()
  }

  if (!isOpen || (!suggestions.length && !loading && searchQuery)) return null

  return (
    <div
      ref={dropdownRef}
      className={cn(
        'absolute top-full mt-2 w-full bg-background border rounded-lg shadow-lg z-[100]',
        'max-h-[400px] overflow-y-auto'
      )}
    >
      {loading ? (
        <div className="p-4 text-center text-muted-foreground">
          <div className="animate-pulse">Searching...</div>
        </div>
      ) : suggestions.length === 0 ? (
        <div className="p-4 text-center text-muted-foreground">
          {searchQuery ? 'No suggestions found' : 'Start typing to search'}
        </div>
      ) : (
        <div className="py-2">
          {suggestions.map((suggestion, index) => {
            const Icon = suggestion.icon || Search
            const isSelected = index === selectedIndex

            return (
              <button
                key={`${suggestion.type}-${suggestion.title}-${index}`}
                type="button"
                onClick={() => handleSuggestionClick(suggestion)}
                onMouseEnter={() => setSelectedIndex(index)}
                className={cn(
                  'w-full px-4 py-3 flex items-start gap-3 hover:bg-muted/50 transition-colors text-left cursor-pointer group',
                  isSelected && 'bg-muted/50'
                )}
              >
                <div className="mt-0.5">
                  {suggestion.type === 'website' && suggestion.website ? (
                    <Favicon
                      website={suggestion.website}
                      fallbackIcon={Icon}
                      title={suggestion.title}
                      className="h-4 w-4"
                    />
                  ) : (
                    <Icon className="h-4 w-4 text-muted-foreground" />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="font-medium text-sm truncate">{suggestion.title}</div>
                  {suggestion.description && (
                    <div className="text-xs text-muted-foreground truncate mt-1">
                      {suggestion.description}
                    </div>
                  )}
                  {suggestion.category && (
                    <div className="text-xs text-muted-foreground mt-1">
                      Category: {suggestion.category}
                    </div>
                  )}
                </div>
                {suggestion.type === 'recent' && (
                  <div className="text-xs text-muted-foreground bg-muted/30 px-1.5 py-0.5 rounded">
                    Recent
                  </div>
                )}
                {suggestion.type === 'trending' && (
                  <TrendingUp className="h-3 w-3 text-muted-foreground" />
                )}
                {suggestion.type === 'category' && (
                  <div className="text-xs text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-950/50 px-1.5 py-0.5 rounded">
                    Category
                  </div>
                )}
                <ArrowRight className="h-4 w-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
              </button>
            )
          })}
        </div>
      )}

      {searchQuery && (
        <div className="border-t px-4 py-2">
          <button
            type="button"
            onClick={() => {
              // Track search for button click
              trackSearch(searchQuery, 0, 'autocomplete-search-button')
              saveRecentSearch(searchQuery)
              router.push(`${getRoute('search')}?q=${encodeURIComponent(searchQuery)}`)
              onClose()
            }}
            className="text-xs text-muted-foreground hover:text-foreground transition-colors flex items-center gap-1 cursor-pointer"
          >
            <Search className="h-3 w-3" />
            Search for "{searchQuery}"
          </button>
        </div>
      )}
    </div>
  )
}
