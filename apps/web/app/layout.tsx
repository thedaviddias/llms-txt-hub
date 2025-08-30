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

/**
 * Root layout component that composes global providers and the top-level page chrome.
 *
 * Renders global providers (authentication via Clerk, design system, Sentry user context,
 * favorites context, analytics tracking, and CSRF protection) and the app shell
 * (Header, main content, Footer) plus utility UI (BackToTop, Vercel toolbar).
 *
 * @param children - The page content to render inside the layout's main region.
 * @returns The root JSX structure for the application.
 */
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
