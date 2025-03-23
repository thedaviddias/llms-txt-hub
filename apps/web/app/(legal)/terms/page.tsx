import { readFile } from 'node:fs/promises'
import fs from 'node:fs'
import path from 'node:path'
import { components } from '@/components/mdx'
import { resolveFromRoot } from '@/lib/utils'
import { Breadcrumb } from '@thedaviddias/design-system/breadcrumb'
import { getBaseUrl } from '@thedaviddias/utils/get-base-url'
import type { Metadata } from 'next'
import { MDXRemote } from 'next-mdx-remote/rsc'

export const metadata: Metadata = {
  title: 'Terms of Service - llms.txt hub',
  description: 'Terms of service for the llms.txt hub website.'
}

export default async function TermsOfServicePage() {
  const breadcrumbItems = [{ name: 'Terms of Service', href: '/terms' }]

  let source = '';
  try {
    // Try multiple possible locations for terms.mdx
    const possiblePaths = [
      path.join(process.cwd(), 'content/legal/terms.mdx'),
      path.join(process.cwd(), 'apps/web/content/legal/terms.mdx'),
      resolveFromRoot('content/legal/terms.mdx')
    ];
    
    // Try each path until we find one that exists
    let filePath = '';
    for (const p of possiblePaths) {
      try {
        await fs.promises.access(p);
        filePath = p;
        break;
      } catch {
        // Path doesn't exist, try the next one
      }
    }
    
    if (filePath) {
      source = await readFile(filePath, 'utf8');
    } else {
      throw new Error('Could not find terms.mdx in any location');
    }
  } catch (error) {
    console.error('Error reading terms of service file:', error);
    source = '# Terms of Service\n\nThe terms of service content is currently unavailable.';
  }

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
