import { ClientProjectsList } from '@/components/projects-list'
import { getAllWebsites } from '@/lib/mdx'
import { generateCollectionSchema } from '@/lib/schema'
import { JsonLd } from '@/components/json-ld'
import { Breadcrumb } from '@thedaviddias/design-system/breadcrumb'
import { getBaseUrl } from '@thedaviddias/utils/get-base-url'
import type { Metadata } from 'next'

export async function generateMetadata(): Promise<Metadata> {
  const baseUrl = getBaseUrl()

  return {
    title: 'Websites - llms.txt Hub',
    description: 'Discover a curated list of websites that implement the llms.txt standard.',
    alternates: {
      canonical: `${baseUrl}/websites`
    }
  }
}

export default async function ProjectsPage() {
  const websites = await getAllWebsites()
  const baseUrl = getBaseUrl()

  const breadcrumbItems = [{ name: 'Websites', href: '/websites' }]

  return (
    <div className="max-w-6xl mx-auto px-4 py-8">
      <JsonLd data={generateCollectionSchema(websites)} />
      <Breadcrumb items={breadcrumbItems} baseUrl={baseUrl} />
      <ClientProjectsList initialWebsites={websites} />
    </div>
  )
}
