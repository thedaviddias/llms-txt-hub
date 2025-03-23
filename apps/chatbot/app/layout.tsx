import type { Metadata } from 'next'
import { DesignSystemProvider } from '@thedaviddias/design-system/theme-provider'
import { fonts } from '@thedaviddias/design-system/lib/fonts'
import '../../../packages/design-system/styles/globals.css'

export const metadata: Metadata = {
  title: 'llms.txt Chatbot',
  description: 'Interactive chatbot for exploring llms.txt files across the web'
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
          <main className="min-h-screen bg-white dark:bg-neutral-950">{children}</main>
        </DesignSystemProvider>
      </body>
    </html>
  )
}
