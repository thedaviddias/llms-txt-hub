import { searchProjects } from '@/app/actions'
import { JsonLd } from '@/components/json-ld'
import { LLMGrid } from '@/components/llm-grid'
import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Search llms.txt Projects - llms.txt hub',
  description: 'Search for AI-ready projects and websites implementing the llms.txt standard.',
  openGraph: {
    title: 'Search llms.txt Projects - llms.txt hub',
    description: 'Search for AI-ready projects and websites implementing the llms.txt standard.',
    url: 'https://llmstxthub.com/search',
    siteName: 'llms.txt hub',
    images: [
      {
        url: 'https://llmstxthub.com/og-image.png',
        width: 1200,
        height: 630
      }
    ],
    locale: 'en_US',
    type: 'website'
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Search llms.txt Projects - llms.txt hub',
    description: 'Search for AI-ready projects and websites implementing the llms.txt standard.',
    images: ['https://llmstxthub.com/og-image.png']
  }
}

export default async function SearchPage({
  searchParams
}: {
  searchParams: { q: string }
}) {
  const query = searchParams.q || ''
  const results = await searchProjects(query)

  return (
    <>
      <JsonLd
        data={{
          '@context': 'https://schema.org',
          '@type': 'SearchResultsPage',
          name: `Search Results for "${query}" - llms.txt hub`,
          description: `Search results for "${query}" on llms.txt hub`,
          url: `https://llmstxthub.com/search?q=${encodeURIComponent(query)}`
        }}
      />
      <div className="container mx-auto px-4 py-8">
        <h1 className="text-3xl font-bold mb-6">Search Results for "{query}"</h1>
        {results.length > 0 ? (
          <LLMGrid items={results} />
        ) : (
          <p>No results found for "{query}". Try a different search term.</p>
        )}
      </div>
    </>
  )
}
