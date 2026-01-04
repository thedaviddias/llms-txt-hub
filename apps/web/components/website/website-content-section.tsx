import { Info } from 'lucide-react'
import { MDXRemote } from 'next-mdx-remote/rsc'
import { components } from '@/components/mdx'
import type { WebsiteMetadata } from '@/lib/content-loader'
import { stripHtmlTags } from '@/lib/utils'

interface WebsiteContentSectionProps {
  website: WebsiteMetadata
}

/**
 * Content section for website detail pages
 * Displays MDX content if available, otherwise shows fallback information
 *
 * @param props - Component props
 * @param props.website - Website metadata with optional content
 * @returns Content section with MDX or fallback information
 */
export function WebsiteContentSection({ website }: WebsiteContentSectionProps) {
  if (website.content) {
    return (
      <section className="animate-fade-in-up opacity-0 stagger-4">
        <div className="prose dark:prose-invert max-w-none prose-headings:scroll-mt-20">
          <MDXRemote source={website.content} components={components} />
        </div>
      </section>
    )
  }

  return (
    <section className="animate-fade-in-up opacity-0 stagger-4 space-y-8">
      {/* About Section */}
      <div className="rounded-2xl border border-border/50 bg-card/50 backdrop-blur-sm p-6 md:p-8">
        <div className="flex items-center gap-3 mb-4">
          <div className="flex items-center justify-center size-10 rounded-xl bg-blue-500/10">
            <Info className="size-5 text-blue-600 dark:text-blue-400" />
          </div>
          <h2 className="text-xl font-bold">About {website.name}</h2>
        </div>
        <p className="text-muted-foreground leading-relaxed">
          {stripHtmlTags(website.description)} This platform provides AI-ready documentation through
          the llms.txt standard, making it easy for AI assistants to understand and interact with
          their services.
        </p>
      </div>

      {/* Key Information Grid */}
      <div className="grid sm:grid-cols-2 gap-4">
        <div className="rounded-xl border border-border/50 bg-card/30 p-5 space-y-1">
          <span className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
            Category
          </span>
          <p className="text-base font-semibold capitalize">
            {website.category ? website.category.replace(/-/g, ' ') : 'General'}
          </p>
        </div>
        <div className="rounded-xl border border-border/50 bg-card/30 p-5 space-y-1">
          <span className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
            Type
          </span>
          <p className="text-base font-semibold">Website</p>
        </div>
        <div className="rounded-xl border border-border/50 bg-card/30 p-5 space-y-1">
          <span className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
            Documentation
          </span>
          <p className="text-base font-semibold">llms.txt compatible</p>
        </div>
        <div className="rounded-xl border border-border/50 bg-card/30 p-5 space-y-1">
          <span className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
            Added
          </span>
          <p className="text-base font-semibold">
            {website.publishedAt
              ? new Date(website.publishedAt).toLocaleDateString('en-US', {
                  month: 'long',
                  day: 'numeric',
                  year: 'numeric'
                })
              : 'Recently'}
          </p>
        </div>
      </div>
    </section>
  )
}
