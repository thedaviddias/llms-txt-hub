'use client'

import type React from 'react'

import { getRoute } from '@/lib/routes'
import { useDebounce } from '@thedaviddias/hooks/use-debounce'
import { useRouter } from 'next/navigation'
import { useCallback, useState } from 'react'

export function useSearch() {
  const [searchQuery, setSearchQuery] = useState('')
  const debouncedSearchQuery = useDebounce(searchQuery, 300)
  const router = useRouter()

  const handleSearch = useCallback(
    (searchQuery: string) => {
      if (!searchQuery.trim()) return
      router.push(`${getRoute('search')}?q=${encodeURIComponent(searchQuery)}`)
    },
    [router]
  )

  return {
    searchQuery,
    setSearchQuery,
    debouncedSearchQuery,
    handleSearch
  }
}
