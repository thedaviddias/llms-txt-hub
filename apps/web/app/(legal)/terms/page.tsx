import { readFile } from 'node:fs/promises'
import { components } from '@/components/mdx'
import { resolveFromRoot } from '@/lib/utils'
import { Breadcrumb } from '@thedaviddias/design-system/breadcrumb'
import { getBaseUrl } from '@thedaviddias/utils/get-base-url'
import type { Metadata } from 'next'
import { MDXRemote } from 'next-mdx-remote/rsc'

export const metadata: Metadata = {
  title: 'Terms of Service - llms.txt Hub',
  description: 'Terms of service for the llms.txt Hub website.'
}

export default async function TermsOfServicePage() {
  const breadcrumbItems = [{ name: 'Terms of Service', href: '/terms' }]

  const filePath = resolveFromRoot('content/legal/terms.mdx')
  const source = await readFile(filePath, 'utf8')

  return (
    <div className="container mx-auto px-4 py-8">
      <Breadcrumb items={breadcrumbItems} baseUrl={getBaseUrl()} />
      <div className="max-w-3xl mx-auto space-y-8">
        <div className="prose dark:prose-invert max-w-none">
          <MDXRemote source={source} components={components} />
        </div>
      </div>
    </div>
  )
}
