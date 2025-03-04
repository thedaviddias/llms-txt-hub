import { getAllGuides, getGuideBySlug } from '@/lib/mdx'
import type { Metadata } from 'next'
import { MDXRemote } from 'next-mdx-remote/rsc'
import { notFound } from 'next/navigation'

import { GuideHeader } from '@/components/guide-header'
import { components } from '@/components/mdx'

interface GuidePageProps {
  params: {
    slug: string
  }
}

async function getGuideFromParams(slug: string) {
  const guide = await getGuideBySlug(slug)

  if (!guide) {
    null
  }

  return guide
}

export async function generateMetadata(props: GuidePageProps): Promise<Metadata> {
  const params = await props.params

  const guide = await getGuideFromParams(params.slug)

  if (!guide) {
    return {}
  }

  return {
    title: guide.title,
    description: guide.description
  }
}

export async function generateStaticParams(): Promise<GuidePageProps['params'][]> {
  const guides = await getAllGuides()
  return guides.map(guide => ({
    slug: guide.slug
  }))
}

export default async function GuidePage(props: GuidePageProps) {
  const params = await props.params

  const guide = await getGuideFromParams(params.slug)

  if (!guide) {
    notFound()
  }

  return (
    <article className="container relative max-w-3xl py-6 lg:py-10">
      <GuideHeader {...guide} />
      <MDXRemote source={guide.content} components={components} />
    </article>
  )
}
