'use client'

import { Button } from '@thedaviddias/design-system/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger
} from '@thedaviddias/design-system/dropdown-menu'
import { ChevronDown, Filter, Search, Users } from 'lucide-react'

type MemberFilter = 'all' | 'contributors' | 'community'

interface MembersSearchControlsProps {
  searchQuery: string
  memberFilter: MemberFilter
  totalMembers: number
  onSearchChange: (value: string) => void
  onFilterChange: (filter: MemberFilter) => void
}

/**
 * Search and filter controls for members list
 * @param props - Component props
 * @param props.searchQuery - Current search query
 * @param props.memberFilter - Current filter selection
 * @param props.totalMembers - Total number of members
 * @param props.onSearchChange - Callback for search input changes
 * @param props.onFilterChange - Callback for filter changes
 * @returns JSX component with search input and filter dropdown
 */
export function MembersSearchControls({
  searchQuery,
  memberFilter,
  totalMembers,
  onSearchChange,
  onFilterChange
}: MembersSearchControlsProps) {
  const filterLabels = {
    all: 'All Members',
    contributors: 'Contributors',
    community: 'Community'
  }

  return (
    <div className="flex flex-col sm:flex-row gap-4 mb-6">
      {/* Search Input */}
      <div className="relative flex-1">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <input
          type="text"
          placeholder="Search members..."
          value={searchQuery}
          onChange={e => onSearchChange(e.target.value)}
          className="h-10 w-full rounded-md border border-input bg-background px-10 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
        />
        {searchQuery && (
          <button
            type="button"
            onClick={() => onSearchChange('')}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
          >
            ×
          </button>
        )}
      </div>

      {/* Filter Dropdown */}
      <div className="flex items-center gap-2">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" className="h-10 gap-2">
              <Filter className="h-4 w-4" />
              {filterLabels[memberFilter]}
              <ChevronDown className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-40">
            <DropdownMenuItem onClick={() => onFilterChange('all')}>
              <Users className="mr-2 h-4 w-4" />
              All Members
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => onFilterChange('contributors')}>
              <Filter className="mr-2 h-4 w-4" />
              Contributors
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => onFilterChange('community')}>
              <Users className="mr-2 h-4 w-4" />
              Community
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>

        <div className="text-sm text-muted-foreground whitespace-nowrap">
          {totalMembers} member{totalMembers !== 1 ? 's' : ''}
        </div>
      </div>
    </div>
  )
}
