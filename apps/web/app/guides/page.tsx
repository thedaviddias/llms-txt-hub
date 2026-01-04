import { Breadcrumb } from '@thedaviddias/design-system/breadcrumb'
import { getBaseUrl } from '@thedaviddias/utils/get-base-url'
import type { Metadata } from 'next'
import { JsonLd } from '@/components/json-ld'
import { GuideCard } from '@/components/sections/guide-card'
import { type GuideMetadata, getGuides } from '@/lib/content-loader'
import { generateGuideSchema } from '@/lib/schema'
import { generateBaseMetadata } from '@/lib/seo/seo-config'
export const metadata: Metadata = generateBaseMetadata({
  title: 'llms.txt Guides - How to Create & Implement llms.txt Files',
  description:
    'Step-by-step guides on how to create llms.txt files, implement the llms.txt standard, and optimize your documentation for AI. Tutorials for developers and content creators.',
  path: '/guides',
  keywords: [
    'how to create llms.txt',
    'llms.txt tutorial',
    'llms.txt implementation guide',
    'create llms.txt file',
    'llms.txt guides',
    'AI documentation tutorial',
    'llms.txt best practices'
  ]
})

export default async function GuidesPage() {
  const guides = await getGuides()

  return (
    <div className="container mx-auto py-8">
      <JsonLd
        data={{
          '@context': 'https://schema.org',
          '@graph': guides.map((guide: GuideMetadata) => generateGuideSchema(guide))
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
            <div className="grid gap-4 sm:gap-6 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4">
              {guides.map((guide: GuideMetadata) => (
                <GuideCard key={guide.slug} guide={guide} />
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
