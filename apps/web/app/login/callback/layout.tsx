import { generateBaseMetadata } from '@/lib/seo/seo-config'
import type { Metadata } from 'next'

export const metadata: Metadata = generateBaseMetadata({
  title: 'Signing In...',
  description: 'Completing sign in process...',
  path: '/login/callback',
  noindex: true // Don't index callback page
})

export default function LoginCallbackLayout({ children }: { children: React.ReactNode }) {
  return children
}
