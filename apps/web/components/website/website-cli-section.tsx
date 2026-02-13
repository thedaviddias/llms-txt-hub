import registryData from '@cli-data/registry.json'
import { Terminal } from 'lucide-react'
import { CopyButton } from '@/components/ui/copy-button'
import type { WebsiteMetadata } from '@/lib/content-loader'

// Build lookup: webSlug -> CLI slug (runs once at module load / build time)
const webSlugToCliSlug = new Map<string, string>()
for (const entry of registryData as { slug: string; webSlug?: string }[]) {
  if (entry.webSlug) {
    webSlugToCliSlug.set(entry.webSlug, entry.slug)
  }
}

interface WebsiteCliSectionProps {
  website: WebsiteMetadata
}

/**
 * CLI install section for website detail pages.
 * Shows the npx install command when a CLI slug exists.
 *
 * @param props - Component props
 * @param props.website - Website metadata
 * @returns CLI install card or null if no CLI slug
 */
export function WebsiteCliSection({ website }: WebsiteCliSectionProps) {
  const cliSlug = webSlugToCliSlug.get(website.slug)

  if (!cliSlug) return null

  return (
    <section className="animate-fade-in-up opacity-0 stagger-2">
      <div className="space-y-4">
        <div className="flex items-center gap-3">
          <div className="flex items-center justify-center size-10 rounded-xl bg-emerald-500/10">
            <Terminal className="size-5 text-emerald-600 dark:text-emerald-400" aria-hidden />
          </div>
          <div>
            <h2 className="text-xl font-bold text-pretty scroll-mt-20" id="install">
              Install into your AI coding agent
            </h2>
            <p className="text-sm text-muted-foreground mt-0.5">
              Add this documentation directly to your development environment
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 rounded-xl bg-zinc-100 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 px-4 py-3">
          <span
            className="select-none text-emerald-600 dark:text-emerald-500/70 font-mono text-sm"
            aria-hidden="true"
          >
            $
          </span>
          <span className="flex-1 text-zinc-800 dark:text-zinc-100 font-mono text-sm truncate">
            npx llmstxt-cli install {cliSlug}
          </span>
          <CopyButton text={`npx llmstxt-cli install ${cliSlug}`} variant="terminal" />
        </div>
      </div>
    </section>
  )
}
