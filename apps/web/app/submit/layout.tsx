import { generateBaseMetadata } from '@/lib/seo/seo-config'
import type { Metadata } from 'next'

export const metadata: Metadata = generateBaseMetadata({
  title: 'Add Your your llms.txt',
  description:
    'Add Your your llms.txt to be included in the llms.txt hub directory. Help others discover your AI-ready documentation.',
  path: '/submit',
  keywords: ['add project', 'submit llms.txt', 'contribute', 'directory submission'],
  noindex: true // Don't index submission page to prevent spam
})

export default function SubmitLayout({ children }: { children: React.ReactNode }) {
  return children
}
