'use client'

import { useSearch } from '@/hooks/use-search'
import { Button } from '@thedaviddias/design-system/button'
import { Input } from '@thedaviddias/design-system/input'
import { Search } from 'lucide-react'

interface SearchBarProps {
  className?: string
  placeholder?: string
}

export function SearchBar({ className = '', placeholder = 'Search...' }: SearchBarProps) {
  const { searchQuery, setSearchQuery, handleSearch } = useSearch()

  return (
    <div className={`relative ${className}`}>
      <form onSubmit={handleSearch}>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            className="pl-9 h-9 pr-12 bg-muted/50"
            placeholder={placeholder}
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
          />
          <Button
            type="submit"
            size="sm"
            variant="ghost"
            className="absolute right-0 top-0 h-full px-3"
          >
            <Search className="h-4 w-4" />
            <span className="sr-only">Search</span>
          </Button>
        </div>
      </form>
    </div>
  )
}
