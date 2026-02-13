import { Breadcrumb } from '@thedaviddias/design-system/breadcrumb'
import { getBaseUrl } from '@thedaviddias/utils/get-base-url'
import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { MDXRemote } from 'next-mdx-remote/rsc'
import { components } from '@/components/mdx'
import { getDocBySlug } from '@/lib/content-loader'
import { getRoute } from '@/lib/routes'
import { generateBaseMetadata } from '@/lib/seo/seo-config'

export const metadata: Metadata = generateBaseMetadata({
  title: 'CLI Documentation - llmstxt-cli',
  description:
    'Learn how to use llmstxt-cli to install llms.txt skills into your AI coding agents. Getting started guide, command reference, and supported agents.',
  path: '/docs',
  keywords: [
    'llmstxt-cli',
    'llms.txt CLI',
    'AI agent skills',
    'CLI documentation',
    'llms.txt install',
    'developer tools'
  ]
})

export default async function DocsPage() {
  const doc = await getDocBySlug('getting-started')

  if (!doc) {
    notFound()
  }

  return (
    <article>
      <Breadcrumb items={[{ name: 'Docs', href: getRoute('docs.list') }]} baseUrl={getBaseUrl()} />
      <div className="space-y-2 mt-6 mb-8">
        <h1 className="text-4xl font-bold tracking-tight">{doc.title}</h1>
        <p className="text-lg text-muted-foreground">{doc.description}</p>
      </div>
      <div className="prose dark:prose-invert max-w-none">
        <MDXRemote source={doc.content || ''} components={components} />
      </div>
    </article>
  )
}
