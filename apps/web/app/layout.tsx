import type { Metadata } from 'next'
import { Inter, JetBrains_Mono } from 'next/font/google'
import type React from 'react'
import '../styles/globals.css'
import { Footer } from '@/components/footer'
import { Header } from '@/components/header'
import { PageTransition } from '@/components/page-transition'
import { ThemeProvider } from '@/components/theme-provider'
import { AuthProvider } from '@/contexts/auth-context'
import PlausibleProvider from 'next-plausible'

// const inter = Inter({ subsets: ['latin'], variable: '--font-inter' })
// const jetbrainsMono = JetBrains_Mono({
//   subsets: ['latin'],
//   variable: '--font-mono',
// })

export const metadata: Metadata = {
  title: 'llms.txt hub',
  description: 'A curated hub for AI-ready documentation implementing the llms.txt standard',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <PlausibleProvider domain="your-domain.com">
        {/* <body className={`${inter.variable} ${jetbrainsMono.variable} font-sans`}> */}
        <body className={`font-sans`}>
          <AuthProvider>
            <ThemeProvider
              attribute="class"
              defaultTheme="system"
              enableSystem
              disableTransitionOnChange
            >
              <div className="flex min-h-screen flex-col">
                <Header />
                <main className="flex-1">
                  <PageTransition>{children}</PageTransition>
                </main>
                <Footer />
              </div>
            </ThemeProvider>
          </AuthProvider>
        </body>
      </PlausibleProvider>
    </html>
  )
}
