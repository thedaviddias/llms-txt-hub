'use client'

import type React from 'react'

import { useDebounce } from '@thedaviddias/hooks/use-debounce'
import { useRouter } from 'next/navigation'
import { useState } from 'react'

export function useSearch() {
  const [searchQuery, setSearchQuery] = useState('')
  const debouncedSearchQuery = useDebounce(searchQuery, 300)
  const router = useRouter()

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault()
    if (searchQuery.trim()) {
      router.push(`/search?q=${encodeURIComponent(searchQuery)}`)
    }
  }

  return {
    searchQuery,
    setSearchQuery,
    debouncedSearchQuery,
    handleSearch
  }
}
