import registryData from '@cli-data/registry.json'
import { FileText, Terminal } from 'lucide-react'
import { LLMButton } from '@/components/buttons/llm-button'
import { CopyButton } from '@/components/ui/copy-button'
import type { WebsiteMetadata } from '@/lib/content-loader'

// Build lookup: webSlug -> CLI slug (runs once at module load / build time)
const webSlugToCliSlug = new Map<string, string>()
for (const entry of registryData as { slug: string; webSlug?: string }[]) {
  if (entry.webSlug) {
    webSlugToCliSlug.set(entry.webSlug, entry.slug)
  }
}

const SUPPORTED_AGENTS = ['Cursor', 'Claude Code', 'Windsurf', 'Cline', 'Codex'] as const

interface WebsiteLLMsSectionProps {
  website: WebsiteMetadata
}

/**
 * LLMs.txt files section for website detail pages
 *
 * @param props - Component props
 * @param props.website - Website metadata with LLMs URLs
 * @returns Section displaying LLMs.txt file access buttons
 */
export function WebsiteLLMsSection({ website }: WebsiteLLMsSectionProps) {
  const cliSlug = webSlugToCliSlug.get(website.slug)

  return (
    <section className="animate-fade-in-up opacity-0 stagger-3">
      <div className="rounded-2xl border border-border/50 bg-card/50 backdrop-blur-sm p-6 md:p-8">
        <div className="flex items-center gap-3 mb-6">
          <div className="flex items-center justify-center size-10 rounded-xl bg-primary/10">
            <FileText className="size-5 text-primary" aria-hidden />
          </div>
          <div>
            <h2 className="text-xl font-bold text-pretty scroll-mt-20" id="documentation">
              AI Documentation Files
            </h2>
            <p className="text-sm text-muted-foreground mt-0.5">
              Access the llms.txt files for this website
            </p>
          </div>
        </div>
        <div className="flex flex-wrap gap-4">
          <LLMButton href={website.llmsUrl} type="llms" size="lg" />
          {website.llmsFullUrl && (
            <LLMButton href={website.llmsFullUrl} type="llms-full" size="lg" />
          )}
        </div>

        {cliSlug && (
          <div className="mt-6 pt-6 border-t border-border/50 space-y-4">
            <div className="flex items-center gap-3">
              <div className="flex items-center justify-center size-8 rounded-lg bg-emerald-500/10">
                <Terminal className="size-4 text-emerald-600 dark:text-emerald-400" />
              </div>
              <div>
                <h3 className="text-sm font-semibold text-pretty">
                  Install into your AI coding agent
                </h3>
                <p className="text-xs text-muted-foreground">
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
              <code className="flex-1 text-zinc-800 dark:text-zinc-100 font-mono text-sm truncate">
                npx llmstxt-cli install {cliSlug}
              </code>
              <CopyButton text={`npx llmstxt-cli install ${cliSlug}`} variant="terminal" />
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <span className="text-xs text-muted-foreground">Works with:</span>
              {SUPPORTED_AGENTS.map(agent => (
                <span
                  key={agent}
                  className="text-xs rounded-full px-2.5 py-0.5 bg-muted/80 text-muted-foreground border border-border/50"
                >
                  {agent}
                </span>
              ))}
            </div>
          </div>
        )}
      </div>
    </section>
  )
}
