import type { Metadata } from 'next'
import { getRoute } from '@/lib/routes'
import { generateBaseMetadata } from '@/lib/seo/seo-config'
import { UninstallFeedbackForm } from './uninstall-feedback-form'

interface ExtensionUninstallPageProps {
  searchParams: Promise<{
    v?: string
    lang?: string
    src?: string
  }>
}

export const metadata: Metadata = generateBaseMetadata({
  title: 'Extension Feedback | LLMs.txt Checker',
  description: 'Share anonymous uninstall feedback to help improve LLMs.txt Checker.',
  path: getRoute('extension.uninstall'),
  noindex: true,
  keywords: ['llms.txt checker', 'extension feedback', 'uninstall survey']
})

export default async function ExtensionUninstallPage({
  searchParams
}: ExtensionUninstallPageProps) {
  const { v, lang } = await searchParams

  return (
    <main className="container mx-auto px-4 py-10">
      <section className="max-w-3xl mx-auto space-y-6">
        <header className="space-y-3">
          <p className="text-sm uppercase tracking-widest text-muted-foreground">
            LLMs.txt Checker
          </p>
          <h1 className="text-3xl font-bold">Before you go, tell us what happened</h1>
          <p className="text-muted-foreground">
            This short form is anonymous and optional. It helps us prioritize the next fixes and
            improvements.
          </p>
        </header>

        <UninstallFeedbackForm version={v} lang={lang} />
      </section>
    </main>
  )
}
