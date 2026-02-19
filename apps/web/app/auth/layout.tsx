import type { Metadata } from 'next'
import type React from 'react'
import { generateBaseMetadata } from '@/lib/seo/seo-config'

export const metadata: Metadata = generateBaseMetadata({
  title: 'Authentication',
  description: 'Manage your llms.txt Hub account authentication.',
  path: '/auth',
  noindex: true
})

/**
 * Layout for auth pages — adds noindex metadata to prevent indexing of auth flows
 */
export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>
}
