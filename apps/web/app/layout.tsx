import type { Metadata } from 'next'

import type React from 'react'
import '../../../packages/design-system/styles/globals.css'
import { Footer } from '@/components/layout/footer'
import { Header } from '@/components/layout/header'
import { PageTransition } from '@/components/page-transition'
import { fonts } from '@thedaviddias/design-system/lib/fonts'
import { DesignSystemProvider } from '@thedaviddias/design-system/theme-provider'

export const metadata: Metadata = {
  title: 'llms.txt hub',
  description: 'A curated hub for AI-ready documentation implementing the llms.txt standard'
}

export default function RootLayout({
  children
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={fonts}>
        <DesignSystemProvider plausibleDomain="llmstxthub.com">
          <div className="flex min-h-screen flex-col">
            <Header />
            <main className="flex-1">
              <PageTransition>{children}</PageTransition>
            </main>
            <Footer />
          </div>
        </DesignSystemProvider>
      </body>
    </html>
  )
}
