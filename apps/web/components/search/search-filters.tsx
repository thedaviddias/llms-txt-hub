'use client'

import { categories } from '@/lib/categories'
import { Button } from '@thedaviddias/design-system/button'
import { Checkbox } from '@thedaviddias/design-system/checkbox'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger
} from '@thedaviddias/design-system/dropdown-menu'
import { Filter, X } from 'lucide-react'
import { useState } from 'react'

interface SearchFiltersProps {
  selectedCategories: string[]
  onCategoryChange: (categories: string[]) => void
  availableCategories?: string[]
  resultCount?: number
}

export function SearchFilters({
  selectedCategories,
  onCategoryChange,
  availableCategories = []
}: SearchFiltersProps) {
  const [isOpen, setIsOpen] = useState(false)

  // Get categories that have results or are selected
  const relevantCategories = categories.filter(
    category =>
      availableCategories.includes(category.slug) || selectedCategories.includes(category.slug)
  )

  const handleCategoryToggle = (categorySlug: string, checked: boolean) => {
    if (checked) {
      onCategoryChange([...selectedCategories, categorySlug])
    } else {
      onCategoryChange(selectedCategories.filter(c => c !== categorySlug))
    }
  }

  const clearAllFilters = () => {
    onCategoryChange([])
  }

  const activeFiltersCount = selectedCategories.length

  if (relevantCategories.length === 0) return null

  return (
    <div className="flex items-center gap-2">
      <DropdownMenu open={isOpen} onOpenChange={setIsOpen}>
        <DropdownMenuTrigger asChild>
          <Button variant="outline" size="sm" className="gap-2 text-sm">
            <Filter className="h-4 w-4 flex-shrink-0" />
            <span className="hidden sm:inline">Filter Results</span>
            <span className="sm:hidden">Filter</span>
            {activeFiltersCount > 0 && (
              <span className="ml-1 bg-primary text-primary-foreground rounded-full px-2 py-0.5 text-xs min-w-[20px] text-center">
                {activeFiltersCount}
              </span>
            )}
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start" className="w-64 sm:w-72 p-0">
          <div className="p-4">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold text-sm">Filter Results</h3>
              {activeFiltersCount > 0 && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={clearAllFilters}
                  className="text-xs h-auto px-2 py-1 hover:bg-muted transition-colors"
                >
                  Clear Filters
                </Button>
              )}
            </div>
            <div className="space-y-3 max-h-64 sm:max-h-80 overflow-y-auto">
              {relevantCategories.map(category => {
                const isSelected = selectedCategories.includes(category.slug)
                const categoryCount = availableCategories.filter(c => c === category.slug).length
                const Icon = category.icon

                return (
                  <div key={category.slug} className="flex items-center space-x-2">
                    <Checkbox
                      id={category.slug}
                      checked={isSelected}
                      onCheckedChange={checked =>
                        handleCategoryToggle(category.slug, checked as boolean)
                      }
                    />
                    <label
                      htmlFor={category.slug}
                      className="flex items-center gap-2 text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer flex-1"
                    >
                      <Icon className="h-4 w-4 text-muted-foreground" />
                      <span className="flex-1">{category.name}</span>
                      {availableCategories.includes(category.slug) && (
                        <span className="text-xs text-muted-foreground">({categoryCount})</span>
                      )}
                    </label>
                  </div>
                )
              })}
            </div>
          </div>
        </DropdownMenuContent>
      </DropdownMenu>

      {/* Active filter badges */}
      {activeFiltersCount > 0 && (
        <div className="flex items-center gap-1 flex-wrap">
          {selectedCategories.map(categorySlug => {
            const category = categories.find(c => c.slug === categorySlug)
            if (!category) return null

            return (
              <div
                key={categorySlug}
                className="inline-flex items-center gap-1 px-2 py-1 bg-primary/10 text-primary rounded-md text-xs"
              >
                <category.icon className="h-3 w-3" />
                <span>{category.name}</span>
                <button
                  type="button"
                  onClick={() => handleCategoryToggle(categorySlug, false)}
                  className="hover:bg-primary/20 rounded-sm p-0.5"
                  aria-label={`Remove ${category.name} filter`}
                >
                  <X className="h-3 w-3" />
                </button>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
