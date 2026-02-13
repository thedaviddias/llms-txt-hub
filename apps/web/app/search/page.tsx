import { ExternalLink, Home as HomeIcon } from 'lucide-react'
import type { Metadata } from 'next'
import Link from 'next/link'
import { Suspense } from 'react'
import { SearchResults } from '@/components/search/search-results'
import { categories } from '@/lib/categories'
import { getRoute } from '@/lib/routes'
import { generateBaseMetadata } from '@/lib/seo/seo-config'
import { tools } from '@/lib/tools'

export const dynamic = 'force-dynamic'

/**
 * Generate dynamic metadata for the search page based on search parameters
 * @param searchParams - Object containing search query parameters
 * @param searchParams.q - The search query string
 * @returns Promise resolving to Next.js Metadata object
 */
export async function generateMetadata({
  searchParams
}: {
  searchParams: Promise<{ q?: string }>
}): Promise<Metadata> {
  const { q } = await searchParams

  const query = q || ''
  const shouldNoIndex = !!query // Don't index search results to avoid duplicate content

  const title = query ? `Search Results for "${query}"` : 'Search'
  const description = query
    ? `Search results for "${query}" in the llms.txt hub database.`
    : 'Search for AI-ready websites and tools in the llms.txt hub.'

  return generateBaseMetadata({
    title,
    description,
    path: '/search',
    keywords: ['search', 'find', 'llms.txt', 'AI tools', 'documentation'],
    noindex: shouldNoIndex
  })
}

export default async function SearchPage({
  searchParams
}: {
  searchParams: Promise<{ q?: string }>
}) {
  const { q } = await searchParams

  const query = q || ''

  return (
    <div className="border-t">
      <div className="relative flex h-full w-full max-w-full flex-row flex-nowrap">
        <div className="sticky top-16 hidden w-[240px] max-w-[240px] min-w-[240px] overflow-hidden sm:block h-screen border-r">
          <div className="p-4 space-y-6">
            {/* Search filters navigation with proper heading hierarchy */}
            <h2 className="sr-only">Search Filters</h2>

            <div>
              <h3 className="font-semibold text-sm mb-4 text-muted-foreground">Categories</h3>
              <nav className="space-y-1">
                <Link
                  href={getRoute('home')}
                  className="flex items-center gap-2 px-2 py-1 text-sm text-muted-foreground hover:text-foreground hover:bg-muted/50 rounded-md transition-colors"
                >
                  <HomeIcon className="h-4 w-4" />
                  All Websites
                </Link>
                {categories.map(category => (
                  <Link
                    key={category.slug}
                    href={getRoute('category.page', { category: category.slug })}
                    className="flex items-center gap-2 px-2 py-1 text-sm text-muted-foreground hover:text-foreground hover:bg-muted/50 rounded-md transition-colors"
                  >
                    <category.icon className="h-4 w-4" />
                    {category.name}
                  </Link>
                ))}
              </nav>
            </div>

            <div>
              <h3 className="font-semibold text-sm mb-4 text-muted-foreground">Tools</h3>
              <nav className="space-y-1">
                {tools.map(tool => (
                  <Link
                    key={tool.slug}
                    href={tool.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center justify-between gap-2 px-2 py-1 text-sm text-muted-foreground hover:text-foreground hover:bg-muted/50 rounded-md transition-colors group"
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <tool.icon className="h-4 w-4 flex-shrink-0" />
                      <span className="truncate">{tool.name}</span>
                    </div>
                    <ExternalLink className="h-3 w-3 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0" />
                  </Link>
                ))}
              </nav>
            </div>
          </div>
        </div>

        <div className="relative flex h-full w-full flex-col gap-3 px-6 pt-6">
          <section className="space-y-6">
            <div className="sticky top-16 z-35 bg-background border-b py-4 -mx-6 px-6">
              <h1 className="text-2xl font-bold">
                {query ? `Search Results for "${query}"` : 'Search'}
              </h1>
              {query && (
                <p className="text-muted-foreground mt-1">
                  Searching across all websites and tools
                </p>
              )}
            </div>

            <Suspense
              fallback={
                <div className="flex justify-center py-8">
                  <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary-500" />
                </div>
              }
            >
              <SearchResults />
            </Suspense>
          </section>
        </div>
      </div>
    </div>
  )
}
