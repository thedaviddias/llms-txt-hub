import { readFile } from 'node:fs/promises'
import { Breadcrumb } from '@/components/breadcrumb'
import { components } from '@/components/mdx'
import { resolveFromRoot } from '@/lib/utils'
import type { Metadata } from 'next'
import { MDXRemote } from 'next-mdx-remote/rsc'

export const metadata: Metadata = {
  title: 'Privacy Policy - llms.txt hub',
  description: 'Privacy policy for the llms.txt hub website.'
}

export default async function PrivacyPolicyPage() {
  const breadcrumbItems = [{ name: 'Privacy Policy', href: '/privacy' }]

  const filePath = resolveFromRoot('content/legal/privacy.mdx')
  const source = await readFile(filePath, 'utf8')

  return (
    <div className="container mx-auto px-4 py-8">
      <Breadcrumb items={breadcrumbItems} />
      <div className="max-w-3xl mx-auto space-y-8">
        <div className="prose dark:prose-invert max-w-none">
          <MDXRemote source={source} components={components} />
        </div>
      </div>
    </div>
  )
}
