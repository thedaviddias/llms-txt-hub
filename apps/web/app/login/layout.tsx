import { generateBaseMetadata } from '@/lib/seo/seo-config'
import type { Metadata } from 'next'

export const metadata: Metadata = generateBaseMetadata({
  title: 'Sign In',
  description:
    'Sign in to your llms.txt hub account to submit websites and manage your contributions.',
  path: '/login',
  keywords: ['sign in', 'login', 'authentication', 'GitHub login'],
  noindex: true // Don't index login page
})

export default function LoginLayout({ children }: { children: React.ReactNode }) {
  return children
}
