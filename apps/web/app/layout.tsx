import { ClerkProvider } from '@clerk/nextjs'
import { VercelToolbar } from '@vercel/toolbar/next'
import { headers } from 'next/headers'
import type { ReactNode } from 'react'
import '../../../packages/design-system/styles/globals.css'
import { AnalyticsHead } from '@thedaviddias/analytics/head'
import { fonts } from '@thedaviddias/design-system/lib/fonts'
import { DesignSystemProvider } from '@thedaviddias/design-system/theme-provider'
import { SentryUserProvider } from '@thedaviddias/observability/providers'
import { getBaseUrl } from '@thedaviddias/utils/get-base-url'
import { AnalyticsTracker } from '@/components/analytics-tracker'
import { CSRFProvider } from '@/components/csrf-provider'
import { Footer } from '@/components/layout/footer'
import { Header } from '@/components/layout/header'
import { BackToTop } from '@/components/ui/back-to-top'
import { FavoritesProvider } from '@/contexts/favorites-context'

export const metadata: import('next').Metadata = {
  title: {
    default: 'llms.txt Hub - Directory of AI-Ready Documentation',
    template: '%s | llms.txt Hub'
  },
  description:
    'The largest directory of websites implementing the llms.txt standard. Find AI-ready documentation, browse llms.txt examples, and learn how to create your own llms.txt file.',
  metadataBase: new URL(getBaseUrl())
}

type RootLayoutProps = {
  children: ReactNode
}

export default async function RootLayout({ children }: RootLayoutProps) {
  const nonce = (await headers()).get('x-nonce') ?? undefined

  return (
    <ClerkProvider signInUrl="/login" signUpUrl="/login" signInFallbackRedirectUrl="/">
      <html lang="en" suppressHydrationWarning>
        <head>
          <AnalyticsHead domain="llmstxthub.com" nonce={nonce} />
          <link
            rel="alternate"
            type="application/feed+json"
            title="llms.txt Hub - New Websites"
            href="/rss.xml"
          />
        </head>
        <body className={fonts}>
          <DesignSystemProvider>
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
                {process.env.NODE_ENV === 'production' && <VercelToolbar />}
              </FavoritesProvider>
            </SentryUserProvider>
          </DesignSystemProvider>
        </body>
      </html>
    </ClerkProvider>
  )
}
