import type { Metadata } from 'next'
import Link from 'next/link'
import { MDXRemote } from 'next-mdx-remote/rsc'
import { components } from '@/components/mdx'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  type ExtensionUpdateMetadata,
  getExtensionUpdateByVersion,
  getLatestExtensionUpdate
} from '@/lib/extension-updates'
import { getRoute } from '@/lib/routes'
import { generateBaseMetadata } from '@/lib/seo/seo-config'

const CHROME_STORE_URL =
  'https://chromewebstore.google.com/detail/llmstxt-checker/klcihkijejcgnaiinaehcjbggamippej'
const CHANGELOG_URL =
  'https://github.com/thedaviddias/llms-txt-chrome-extension/blob/main/CHANGELOG.md'

interface WhatsNewPageProps {
  searchParams: Promise<{
    v?: string
    pv?: string
    lang?: string
    src?: string
  }>
}

export const metadata: Metadata = generateBaseMetadata({
  title: "What's New | LLMs.txt Checker",
  description: 'Release highlights and updates for the LLMs.txt Checker extension.',
  path: getRoute('extension.whatsNew'),
  noindex: true,
  keywords: ['llms.txt checker', 'whats new', 'release notes', 'extension updates']
})

const normalizeVersion = (value?: string): string => {
  if (typeof value !== 'string') {
    return ''
  }

  const normalized = value.trim().toLowerCase()
  return normalized.startsWith('v') ? normalized.slice(1) : normalized
}

const resolveRelease = (requestedVersion?: string): ExtensionUpdateMetadata | null => {
  if (typeof requestedVersion !== 'string' || requestedVersion.trim().length === 0) {
    return getLatestExtensionUpdate()
  }

  return getExtensionUpdateByVersion(requestedVersion) || getLatestExtensionUpdate()
}

const formatReleaseDate = (date: string): string => {
  const parsed = new Date(date)
  if (Number.isNaN(parsed.getTime())) {
    return date
  }

  return parsed.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  })
}

export default async function ExtensionWhatsNewPage({ searchParams }: WhatsNewPageProps) {
  const { v, pv, lang } = await searchParams
  const release = resolveRelease(v)

  if (!release) {
    return (
      <main className="container mx-auto px-4 py-12">
        <div className="max-w-3xl mx-auto rounded-2xl border border-border/50 bg-card/50 p-8 space-y-4">
          <h1 className="text-2xl font-bold">No release notes available yet</h1>
          <p className="text-muted-foreground">We could not find release notes for this version.</p>
          <div className="flex flex-wrap gap-3">
            <Link
              href={CHANGELOG_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="underline"
            >
              View changelog
            </Link>
            <Link href={getRoute('home')} className="underline">
              Go to llms.txt Hub
            </Link>
          </div>
        </div>
      </main>
    )
  }

  const normalizedCurrentVersion = normalizeVersion(release.version)
  const normalizedPreviousVersion = normalizeVersion(pv)
  const showPreviousVersion =
    normalizedPreviousVersion.length > 0 && normalizedPreviousVersion !== normalizedCurrentVersion
  const showEnglishNotice = !!lang && !lang.toLowerCase().startsWith('en')

  return (
    <main className="container mx-auto px-4 py-8">
      <article className="max-w-4xl mx-auto space-y-8">
        <header className="rounded-2xl border border-border/50 bg-gradient-to-br from-card via-card to-muted/40 p-8 space-y-4">
          <p className="text-sm uppercase tracking-widest text-muted-foreground">
            LLMs.txt Checker
          </p>
          <h1 className="text-3xl sm:text-4xl font-bold">{release.title}</h1>
          <p className="text-lg text-muted-foreground max-w-2xl">{release.description}</p>

          <div className="flex flex-wrap items-center gap-3 text-sm">
            <span className="rounded-full border border-border bg-background px-3 py-1">
              Version {release.version}
            </span>
            <span className="rounded-full border border-border bg-background px-3 py-1">
              {formatReleaseDate(release.date)}
            </span>
            {showPreviousVersion && (
              <span className="rounded-full border border-border bg-background px-3 py-1">
                Updated from {normalizedPreviousVersion}
              </span>
            )}
          </div>

          {showEnglishNotice && (
            <p className="text-sm text-muted-foreground">
              Release notes are currently available in English only.
            </p>
          )}
        </header>

        <section className="space-y-4" aria-labelledby="top-highlights">
          <h2 id="top-highlights" className="text-2xl font-semibold">
            Top highlights
          </h2>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {release.highlights.slice(0, 5).map(highlight => (
              <Card key={highlight} className="h-full border-border/50">
                <CardHeader>
                  <CardTitle className="text-base">Key improvement</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground">{highlight}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </section>

        <section className="prose dark:prose-invert max-w-none">
          <MDXRemote source={release.content || ''} components={components} />
        </section>

        <section
          className="rounded-2xl border border-border/50 bg-card/50 p-6 space-y-3"
          aria-label="Related links"
        >
          <h2 className="text-lg font-semibold">Where to go next</h2>
          <div className="flex flex-wrap gap-3 text-sm">
            <Link
              href={CHROME_STORE_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="underline"
            >
              Chrome Web Store
            </Link>
            <Link
              href={CHANGELOG_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="underline"
            >
              GitHub changelog
            </Link>
            <Link href={getRoute('home')} className="underline">
              LLMs.txt Hub homepage
            </Link>
          </div>
        </section>
      </article>
    </main>
  )
}
