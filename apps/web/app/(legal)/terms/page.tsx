import { Breadcrumb } from '@thedaviddias/design-system/breadcrumb'
import { getBaseUrl } from '@thedaviddias/utils/get-base-url'
import type { Metadata } from 'next'
import { MDXRemote } from 'next-mdx-remote/rsc'
import remarkGfm from 'remark-gfm'
import { components } from '@/components/mdx'
import { getLegalContent } from '@/lib/content-loader'
import { generateBaseMetadata } from '@/lib/seo/seo-config'

export const metadata: Metadata = generateBaseMetadata({
  title: 'Terms of Service',
  description:
    'Terms of service for the llms.txt hub website. Read our terms and conditions for using this service.',
  path: '/terms',
  noindex: true
})

export default async function TermsOfServicePage() {
  const breadcrumbItems = [{ name: 'Terms of Service', href: '/terms' }]
  const source = await getLegalContent('terms')

  return (
    <div className="container mx-auto px-4 py-8">
      <Breadcrumb items={breadcrumbItems} baseUrl={getBaseUrl()} />
      <div className="max-w-3xl mx-auto space-y-8">
        <div className="space-y-4 pb-8 border-b">
          <h1 className="text-4xl font-bold tracking-tight lg:text-5xl">Terms of Service</h1>
        </div>
        <div className="prose dark:prose-invert max-w-none">
          <MDXRemote
            source={source}
            components={components}
            options={{
              mdxOptions: {
                remarkPlugins: [remarkGfm]
              }
            }}
          />
        </div>
      </div>
    </div>
  )
}
