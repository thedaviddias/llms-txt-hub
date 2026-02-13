import { FileText } from 'lucide-react'
import { LLMButton } from '@/components/buttons/llm-button'
import type { WebsiteMetadata } from '@/lib/content-loader'

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
      </div>
    </section>
  )
}
