import { ClerkProvider } from '@clerk/nextjs'
import { VercelToolbar } from '@vercel/toolbar/next'
import type { Metadata } from 'next'
import type React from 'react'
import '../../../packages/design-system/styles/globals.css'
import { AnalyticsTracker } from '@/components/analytics-tracker'
import { CSRFProvider } from '@/components/csrf-provider'
import { Footer } from '@/components/layout/footer'
import { Header } from '@/components/layout/header'
import { BackToTop } from '@/components/ui/back-to-top'
import { FavoritesProvider } from '@/contexts/favorites-context'
import { fonts } from '@thedaviddias/design-system/lib/fonts'
import { DesignSystemProvider } from '@thedaviddias/design-system/theme-provider'
import { SentryUserProvider } from '@thedaviddias/observability/providers'
import { getBaseUrl } from '@thedaviddias/utils/get-base-url'

export const metadata: Metadata = {
  title: 'llms.txt hub',
  description: 'A curated hub for AI-ready documentation implementing the llms.txt standard',
  metadataBase: new URL(getBaseUrl())
}

type RootLayoutProps = {
  children: React.ReactNode
}

export default function RootLayout({ children }: RootLayoutProps) {
  return (
    <ClerkProvider signInUrl="/login" signUpUrl="/login" signInFallbackRedirectUrl="/">
      <html lang="en" suppressHydrationWarning>
        <body className={fonts}>
          <DesignSystemProvider plausibleDomain="llmstxthub.com">
            <SentryUserProvider>
              <FavoritesProvider>
                <AnalyticsTracker />
                <CSRFProvider />
                <div className="flex min-h-screen flex-col">
                  <Header />
                  <main className="flex flex-1 flex-col">{children}</main>
                  <Footer />
                </div>
                <BackToTop />
                <VercelToolbar />
              </FavoritesProvider>
            </SentryUserProvider>
          </DesignSystemProvider>
        </body>
      </html>
    </ClerkProvider>
  )
}
