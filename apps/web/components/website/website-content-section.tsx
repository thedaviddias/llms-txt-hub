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
    <section
      className="animate-fade-in-up opacity-0 stagger-4 space-y-8"
      aria-labelledby="about-heading"
    >
      {/* About Section */}
      <div className="rounded-2xl border border-border/50 bg-card/50 backdrop-blur-sm p-6 md:p-8">
        <div className="flex items-center gap-3 mb-4">
          <div className="flex items-center justify-center size-10 rounded-xl bg-primary/10">
            <Info className="size-5 text-primary" aria-hidden />
          </div>
          <div>
            <h2 className="text-xl font-bold text-pretty scroll-mt-20" id="about-heading">
              About {website.name}
            </h2>
            <p className="text-sm text-muted-foreground mt-0.5">Summary and key details</p>
          </div>
        </div>
        <p className="text-muted-foreground leading-relaxed text-pretty">
          {stripHtmlTags(website.description)} This platform provides AI-ready documentation through
          the llms.txt standard, making it easy for AI assistants to understand and interact with
          their services.
        </p>
      </div>

      {/* Key Information Grid */}
      <div className="grid sm:grid-cols-2 gap-4">
        {[
          {
            label: 'Category',
            value: website.category ? website.category.replace(/-/g, ' ') : 'General',
            className: 'capitalize'
          },
          { label: 'Type', value: 'Website' },
          { label: 'Documentation', value: 'llms.txt compatible' },
          {
            label: 'Added',
            value: website.publishedAt
              ? new Date(website.publishedAt).toLocaleDateString('en-US', {
                  month: 'long',
                  day: 'numeric',
                  year: 'numeric'
                })
              : 'Recently'
          }
        ].map(({ label, value, className = '' }) => (
          <div
            key={label}
            className="rounded-2xl border border-border/50 bg-card/50 backdrop-blur-sm p-5 space-y-1 transition-colors hover:border-border"
          >
            <span className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
              {label}
            </span>
            <p className={`text-base font-semibold ${className}`}>{value}</p>
          </div>
        ))}
      </div>
    </section>
  )
}
