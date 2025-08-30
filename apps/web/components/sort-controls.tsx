'use client'

import { ToggleGroup, ToggleGroupItem } from '@thedaviddias/design-system/toggle-group'
import { Clock, SortAsc } from 'lucide-react'
import { usePathname, useRouter, useSearchParams } from 'next/navigation'
import { useCallback } from 'react'

interface SortControlsProps {
  currentSort: string
}

export function SortControls({ currentSort }: SortControlsProps) {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()

  const handleSortChange = useCallback(
    (value: string) => {
      if (!value) return

      const params = new URLSearchParams(searchParams.toString())
      if (value === 'name') {
        params.delete('sort')
      } else {
        params.set('sort', value)
      }

      const queryString = params.toString()
      const newUrl = queryString ? `${pathname}?${queryString}` : pathname
      router.push(newUrl)
    },
    [pathname, router, searchParams]
  )

  return (
    <div className="flex justify-end items-center">
      <div className="flex items-center gap-2">
        <span className="text-sm text-muted-foreground">Sort by:</span>
        <ToggleGroup
          type="single"
          value={currentSort}
          onValueChange={handleSortChange}
          className="bg-background border rounded-md"
        >
          <ToggleGroupItem
            value="latest"
            className="px-3 py-2 h-10 data-[state=on]:bg-accent cursor-pointer"
          >
            <Clock className="size-4 mr-2" />
            <span className="text-sm">Latest</span>
          </ToggleGroupItem>
          <ToggleGroupItem
            value="name"
            className="px-3 py-2 h-10 data-[state=on]:bg-accent cursor-pointer"
          >
            <SortAsc className="size-4 mr-2" />
            <span className="text-sm">Name</span>
          </ToggleGroupItem>
        </ToggleGroup>
      </div>
    </div>
  )
}
