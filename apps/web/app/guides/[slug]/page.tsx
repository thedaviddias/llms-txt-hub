import { getGuides, getGuideBySlug } from '@/lib/content-loader'
import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { getBaseUrl } from '@thedaviddias/utils/get-base-url'
import { GuideHeader } from '@/components/guide-header'
import { JsonLd } from '@/components/json-ld'
import { generateGuideSchema } from '@/lib/schema'
import { Breadcrumb } from '@thedaviddias/design-system/breadcrumb'
import { getRoute } from '@/lib/routes'
import { MDXRemote } from 'next-mdx-remote/rsc'
import { components } from '@/components/mdx'

interface GuidePageProps {
  params: {
    slug: string
  }
}

export async function generateMetadata(props: GuidePageProps): Promise<Metadata> {
  const { slug } = await props.params
  const guide = await getGuideBySlug(slug)

  if (!guide) {
    return {}
  }

  return {
    title: `${guide.title} - llms.txt Hub`,
    description: guide?.description,
    alternates: {
      canonical: getRoute('guides.guide', { slug })
    }
  }
}

export async function generateStaticParams(): Promise<GuidePageProps['params'][]> {
  const guides = await getGuides()

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
