import { getAllGuides } from '@/lib/mdx'
import { generateGuideSchema } from '@/lib/schema'
import { JsonLd } from '@/components/json-ld'
import { Breadcrumb } from '@thedaviddias/design-system/breadcrumb'
import { getBaseUrl } from '@thedaviddias/utils/get-base-url'
import { format } from 'date-fns'
import type { Metadata } from 'next'
import Link from 'next/link'

export const metadata: Metadata = {
  title: 'Guides - llms.txt Hub',
  description: 'Learn how to implement and use llms.txt effectively with our comprehensive guides.',
  openGraph: {
    title: 'Guides - llms.txt Hub',
    description:
      'Learn how to implement and use llms.txt effectively with our comprehensive guides.',
    url: `${getBaseUrl()}/guides`,
    images: [
      {
        url: `${getBaseUrl()}/opengraph-image.png`,
        width: 1200,
        height: 630
      }
    ]
  }
}

export default async function GuidesPage() {
  const guides = await getAllGuides()

  return (
    <div className="max-w-6xl mx-auto px-4 py-8">
      <JsonLd
        data={{
          '@context': 'https://schema.org',
          '@graph': guides.map(guide => generateGuideSchema(guide))
        }}
      />
      <div className="space-y-12">
        <Breadcrumb items={[{ name: 'Guides', href: '/guides' }]} baseUrl={getBaseUrl()} />

        <div className="space-y-4">
          <h1 className="text-4xl font-bold">Guides</h1>
          <p className="text-lg text-muted-foreground">
            Learn how to implement and use llms.txt effectively with our comprehensive guides.
          </p>
        </div>

        {guides?.length ? (
          <section className="space-y-6">
            <div className="grid gap-10">
              {guides.map(guide => (
                <article key={guide.slug} className="group relative flex flex-col space-y-2">
                  <h2 className="text-2xl font-bold">
                    <Link href={`/guides/${guide.slug}`} className="hover:underline">
                      {guide.title}
                    </Link>
                  </h2>
                  {guide.description && (
                    <p className="text-muted-foreground">{guide.description}</p>
                  )}
                  <div className="flex items-center space-x-4 text-sm text-muted-foreground">
                    <time dateTime={guide.date}>
                      {format(new Date(guide.date), 'MMMM dd, yyyy')}
                    </time>
                    <span>•</span>
                    <div className="flex items-center space-x-1">
                      {guide.authors?.map(
                        (author: { name: string; url?: string }, index: number) => (
                          <span key={author.name}>
                            {author.url ? (
                              <Link
                                href={author.url}
                                className="hover:underline"
                                target="_blank"
                                rel="noopener noreferrer"
                              >
                                {author.name}
                              </Link>
                            ) : (
                              author.name
                            )}
                            {index < guide.authors.length - 1 && ', '}
                          </span>
                        )
                      )}
                    </div>
                  </div>
                </article>
              ))}
            </div>
          </section>
        ) : (
          <p>No guides published.</p>
        )}
      </div>
    </div>
  )
}
