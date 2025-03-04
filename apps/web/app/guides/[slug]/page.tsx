import { getAllGuides, getGuideBySlug } from '@/lib/mdx'
import { generateGuideSchema } from '@/lib/schema'
import { JsonLd } from '@/components/json-ld'
import { components } from '@/components/mdx'
import { Breadcrumb } from '@thedaviddias/design-system/breadcrumb'
import { getBaseUrl } from '@thedaviddias/utils/get-base-url'
import type { Metadata } from 'next'
import { MDXRemote } from 'next-mdx-remote/rsc'
import { notFound } from 'next/navigation'

interface GuidePageProps {
  params: {
    slug: string
  }
}

export async function generateMetadata({ params }: GuidePageProps): Promise<Metadata> {
  const { slug } = await params

  const guide = await getGuideBySlug(slug)

  if (!guide) {
    return {}
  }

  const baseUrl = getBaseUrl()

  return {
    title: `${guide.title} - llms.txt Hub`,
    description: guide.description,
    alternates: {
      canonical: `${baseUrl}/guides/${slug}`
    }
  }
}

export async function generateStaticParams(): Promise<GuidePageProps['params'][]> {
  const guides = await getAllGuides()
  return guides.map(guide => ({
    slug: guide.slug
  }))
}

export default async function GuidePage({ params }: GuidePageProps) {
  const { slug } = await params

  const guide = await getGuideBySlug(slug)

  if (!guide) {
    notFound()
  }

  const breadcrumbItems = [
    { name: 'Guides', href: '/guides' },
    { name: guide.title, href: `/guides/${params.slug}` }
  ]

  return (
    <div className="container mx-auto px-4 py-8">
      <JsonLd data={generateGuideSchema(guide)} />
      <div className="max-w-3xl mx-auto space-y-8">
        <Breadcrumb items={breadcrumbItems} baseUrl={getBaseUrl()} />
        <article className="prose dark:prose-invert max-w-none">
          <MDXRemote source={guide.content} components={components} />
        </article>
      </div>
    </div>
  )
}
