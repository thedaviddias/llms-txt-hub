import { ClientProjectsList } from '@/components/projects-list'
import { getWebsites } from '@/lib/content-loader'
import { Breadcrumb } from '@thedaviddias/design-system/breadcrumb'
import { getBaseUrl } from '@thedaviddias/utils/get-base-url'
import type { Metadata } from 'next'
import { getRoute } from '@/lib/routes'
import { JsonLd } from '@/components/json-ld'
import { generateCollectionSchema } from '@/lib/schema'

export function generateMetadata(): Metadata {
  const baseUrl = getBaseUrl()

  return {
    title: 'Websites - llms.txt hub',
    description: 'Discover a curated list of websites that implement the llms.txt standard.',
    alternates: {
      canonical: `${baseUrl}/websites`
    }
  }
}

export default async function ProjectsPage() {
  const websites = await getWebsites()
  const baseUrl = getBaseUrl()
  const breadcrumbItems = [{ name: 'Websites', href: getRoute('website.list') }]

  return (
    <div className="max-w-6xl mx-auto px-4 py-8">
      <JsonLd data={generateCollectionSchema(websites)} />
      <Breadcrumb items={breadcrumbItems} baseUrl={baseUrl} />

      <ClientProjectsList initialWebsites={websites} />
    </div>
  )
}
