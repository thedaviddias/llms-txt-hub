'use client'
import { SearchAutocomplete } from '@/components/search/search-autocomplete'
import { Search } from 'lucide-react'
import { useRef } from 'react'

interface DesktopSearchFormProps {
  searchQuery: string
  onSearchChange: (e: React.ChangeEvent<HTMLInputElement>) => void
  onInputFocus: () => void
  onSubmit: (e: React.FormEvent) => void
  showAutocomplete: boolean
  onAutocompleteClose: () => void
  onAutocompleteSelect: () => void
}

/**
 * Desktop search form component
 *
 * @param searchQuery - Current search query
 * @param onSearchChange - Search input change handler
 * @param onInputFocus - Input focus handler
 * @param onSubmit - Form submission handler
 * @param showAutocomplete - Whether autocomplete is shown
 * @param onAutocompleteClose - Autocomplete close handler
 * @param onAutocompleteSelect - Autocomplete selection handler
 * @returns JSX.Element - Desktop search form
 */
export function DesktopSearchForm({
  searchQuery,
  onSearchChange,
  onInputFocus,
  onSubmit,
  showAutocomplete,
  onAutocompleteClose,
  onAutocompleteSelect
}: DesktopSearchFormProps) {
  const searchInputRef = useRef<HTMLInputElement>(null)

  return (
    <div className="hidden md:block flex-1 2xl:flex-none 2xl:w-full max-w-2xl 2xl:max-w-none">
      <form onSubmit={onSubmit} className="relative 2xl:max-w-2xl 2xl:mx-auto">
        <input
          ref={searchInputRef}
          type="text"
          placeholder="Search websites, tools, and platforms..."
          value={searchQuery}
          onChange={onSearchChange}
          onFocus={onInputFocus}
          className="w-full rounded-lg border border-input bg-background px-4 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
        />
        <button
          type="submit"
          className="absolute inset-y-0 right-0 flex items-center px-3 text-muted-foreground hover:text-foreground"
          aria-label="Search"
        >
          <Search className="h-4 w-4" />
        </button>
        <SearchAutocomplete
          searchQuery={searchQuery}
          isOpen={showAutocomplete}
          onClose={onAutocompleteClose}
          anchorRef={searchInputRef}
          onSelect={onAutocompleteSelect}
        />
      </form>
    </div>
  )
}

interface MobileSearchOverlayProps {
  showMobileSearch: boolean
  searchQuery: string
  onSearchChange: (e: React.ChangeEvent<HTMLInputElement>) => void
  onInputFocus: () => void
  onSubmit: (e: React.FormEvent) => void
  showMobileAutocomplete: boolean
  onMobileSearchClose: () => void
  onAutocompleteSelect: () => void
}

/**
 * Mobile search overlay component
 *
 * @param showMobileSearch - Whether mobile search is shown
 * @param searchQuery - Current search query
 * @param onSearchChange - Search input change handler
 * @param onInputFocus - Input focus handler
 * @param onSubmit - Form submission handler
 * @param showMobileAutocomplete - Whether mobile autocomplete is shown
 * @param onMobileSearchClose - Mobile search close handler
 * @param onAutocompleteSelect - Autocomplete selection handler
 * @returns JSX.Element - Mobile search overlay
 */
export function MobileSearchOverlay({
  showMobileSearch,
  searchQuery,
  onSearchChange,
  onInputFocus,
  onSubmit,
  showMobileAutocomplete,
  onMobileSearchClose,
  onAutocompleteSelect
}: MobileSearchOverlayProps) {
  const mobileSearchInputRef = useRef<HTMLInputElement>(null)

  if (!showMobileSearch) return null

  return (
    <>
      {/* Backdrop */}
      <button
        type="button"
        className="md:hidden fixed inset-0 top-16 z-40 bg-black/50 backdrop-blur-sm"
        onClick={onMobileSearchClose}
        aria-label="Close search"
      />
      {/* Search container */}
      <div className="md:hidden fixed inset-x-0 top-16 z-50 bg-background">
        <div className="px-4 sm:px-6 py-3 border-t">
          <form onSubmit={onSubmit} className="relative">
            <input
              ref={mobileSearchInputRef}
              type="text"
              placeholder="Search AI documentation and tools..."
              value={searchQuery}
              onChange={onSearchChange}
              onFocus={onInputFocus}
              className="w-full rounded-lg border border-input bg-background px-4 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
            />
            <button
              type="submit"
              className="absolute inset-y-0 right-0 flex items-center px-3 text-muted-foreground hover:text-foreground"
              aria-label="Search"
            >
              <Search className="h-4 w-4" />
            </button>
            <SearchAutocomplete
              searchQuery={searchQuery}
              isOpen={showMobileAutocomplete}
              onClose={() => onMobileSearchClose()}
              anchorRef={mobileSearchInputRef}
              onSelect={onAutocompleteSelect}
            />
          </form>
        </div>
      </div>
    </>
  )
}
