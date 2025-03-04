import type { Metadata } from 'next'
import type React from 'react'
import '../../../packages/design-system/styles/globals.css'
import { Footer } from '@/components/layout/footer'
import { Header } from '@/components/layout/header'
import { PageTransition } from '@/components/page-transition'
import { fonts } from '@thedaviddias/design-system/lib/fonts'
import { DesignSystemProvider } from '@thedaviddias/design-system/theme-provider'
import { SentryUserProvider } from '@thedaviddias/observability/providers'
import { getBaseUrl } from '@thedaviddias/utils/get-base-url'

export const metadata: Metadata = {
  title: 'llms.txt Hub',
  description: 'A curated hub for AI-ready documentation implementing the llms.txt standard',
  metadataBase: new URL(getBaseUrl())
}

type RootLayoutProps = {
  children: React.ReactNode
}

export default function RootLayout({ children }: RootLayoutProps) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={fonts}>
        <DesignSystemProvider plausibleDomain="llmstxthub.com">
          <SentryUserProvider>
            <div className="flex min-h-screen flex-col">
              <Header />
              <main className="flex-1">
                <PageTransition>{children}</PageTransition>
              </main>
              <Footer />
            </div>
          </SentryUserProvider>
        </DesignSystemProvider>
      </body>
    </html>
  )
}
