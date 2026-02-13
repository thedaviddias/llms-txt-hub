import { Breadcrumb } from '@thedaviddias/design-system/breadcrumb'
import { getBaseUrl } from '@thedaviddias/utils/get-base-url'
import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { MDXRemote } from 'next-mdx-remote/rsc'
import { GuideHeader } from '@/components/guide-header'
import { JsonLd } from '@/components/json-ld'
import { components } from '@/components/mdx'
import { type GuideMetadata, getGuideBySlug, getGuides } from '@/lib/content-loader'
import { getRoute } from '@/lib/routes'
import { generateGuideSchema } from '@/lib/schema'
import { generateDynamicMetadata } from '@/lib/seo/seo-config'

interface GuidePageProps {
  params: Promise<{
    slug: string
  }>
}

/**
 * Generates metadata for a guide page
 */
export async function generateMetadata(props: GuidePageProps): Promise<Metadata> {
  const { slug } = await props.params
  const guide = await getGuideBySlug(slug)

  if (!guide) {
    return {}
  }

  return generateDynamicMetadata({
    type: 'guide',
    name: guide.title,
    description: guide.description || `Learn about ${guide.title} in our comprehensive guide`,
    slug: guide.slug,
    publishedAt: guide.date,
    additionalKeywords: ['guide', 'tutorial', 'how-to', 'llms.txt implementation']
  })
}

/**
 * Generates static params for all guide pages
 */
export async function generateStaticParams(): Promise<Awaited<GuidePageProps['params']>[]> {
  const guides = await getGuides()

  return guides.map((guide: GuideMetadata) => ({
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
    { name: 'Guides', href: getRoute('guides.list') },
    { name: guide.title, href: getRoute('guides.guide', { slug }) }
  ]

  return (
    <article className="container relative max-w-3xl py-6 lg:py-10">
      <JsonLd data={generateGuideSchema(guide)} />
      <Breadcrumb items={breadcrumbItems} baseUrl={getBaseUrl()} />
      <GuideHeader {...guide} />
      <article>
        <MDXRemote source={guide.content || ''} components={components} />
      </article>
    </article>
  )
}
