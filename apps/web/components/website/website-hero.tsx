import { Badge } from '@thedaviddias/design-system/badge'
import { Breadcrumb } from '@thedaviddias/design-system/breadcrumb'
import { getBaseUrl } from '@thedaviddias/utils/get-base-url'
import { getFaviconUrl } from '@thedaviddias/utils/get-favicon-url'
import { Calendar, ExternalLink, Globe, Hash } from 'lucide-react'
import Link from 'next/link'
import { FavoriteButton } from '@/components/ui/favorite-button'
import type { WebsiteMetadata } from '@/lib/content-loader'
import { getRoute } from '@/lib/routes'
import { generateAltText } from '@/lib/seo/seo-config'

interface WebsiteHeroProps {
  website: WebsiteMetadata
  breadcrumbItems: Array<{ name: string; href: string }>
}

/**
 * Hero section for website detail pages
 *
 * @param props - Component props
 * @param props.website - Website metadata
 * @param props.breadcrumbItems - Breadcrumb navigation items
 * @returns Hero section with website information
 */
export function WebsiteHero({ website, breadcrumbItems }: WebsiteHeroProps) {
  return (
    <section className="relative overflow-hidden border-b border-border/50 bg-gradient-to-b from-muted/30 via-background to-background">
      {/* Background Pattern */}
      <div className="absolute inset-0 -z-10">
        <div className="absolute inset-0 bg-[linear-gradient(to_right,#8080800a_1px,transparent_1px),linear-gradient(to_bottom,#8080800a_1px,transparent_1px)] bg-[size:32px_32px]" />
        <div className="absolute left-0 right-0 top-0 -z-10 m-auto h-[310px] w-full bg-gradient-to-br from-primary/5 via-transparent to-secondary/5 blur-[100px]" />
      </div>

      <div className="container mx-auto px-6 py-8 md:py-12">
        {/* Breadcrumb - stagger 1 */}
        <div className="animate-fade-in-up opacity-0 stagger-1 mb-8 max-w-4xl mx-auto">
          <Breadcrumb items={breadcrumbItems} baseUrl={getBaseUrl()} />
        </div>

        {/* Main Hero Content */}
        <div className="animate-fade-in-up opacity-0 stagger-2 max-w-4xl mx-auto">
          <div className="flex flex-col md:flex-row md:items-start gap-6 md:gap-8">
            {/* Favicon/Logo */}
            <div className="flex-shrink-0">
              <Link
                href={website.website}
                target="_blank"
                rel="noopener noreferrer"
                className="group relative block focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background rounded-2xl"
              >
                <div className="absolute -inset-2 rounded-2xl bg-gradient-to-br from-primary/20 to-secondary/20 opacity-0 blur-xl transition-all duration-500 group-hover:opacity-100" />
                <div className="relative overflow-hidden rounded-2xl border border-border/50 bg-card p-3 shadow-lg transition-all duration-300 group-hover:scale-105 group-hover:shadow-xl">
                  <img
                    src={getFaviconUrl(website.website, 256) || '/placeholder.svg'}
                    alt={generateAltText('favicon', website.name)}
                    width={72}
                    height={72}
                    className="rounded-xl"
                  />
                </div>
              </Link>
            </div>

            {/* Content */}
            <div className="flex-1 space-y-4">
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div className="space-y-3">
                  {/* Title and Badges */}
                  <div className="flex flex-wrap items-center gap-3">
                    <h1 className="text-3xl md:text-4xl lg:text-5xl font-bold tracking-tight text-pretty">
                      {website.name}
                    </h1>
                    {website.isUnofficial && (
                      <Badge
                        variant="outline"
                        className="text-xs border-amber-500/30 bg-amber-500/10 text-amber-700 dark:border-amber-400/30 dark:bg-amber-400/10 dark:text-amber-300"
                      >
                        Unofficial
                      </Badge>
                    )}
                  </div>

                  {/* Website URL */}
                  <Link
                    href={website.website}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="group inline-flex items-center gap-2 text-base text-muted-foreground hover:text-foreground transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background rounded"
                  >
                    <Globe className="size-4" />
                    <span className="border-b border-dashed border-muted-foreground/50 group-hover:border-foreground/50 transition-colors">
                      {website.website.replace(/^https?:\/\/(www\.)?/, '').replace(/\/$/, '')}
                    </span>
                    <ExternalLink className="size-3.5 transition-transform group-hover:translate-x-0.5" />
                  </Link>
                </div>

                {/* Favorite Button */}
                <FavoriteButton slug={website.slug} size="lg" variant="default" />
              </div>

              {/* Description */}
              <p className="text-lg text-muted-foreground leading-relaxed max-w-2xl text-pretty">
                {website.description}
              </p>

              {/* Meta Info Row */}
              <div className="flex flex-wrap items-center gap-3 pt-1">
                {website.category && (
                  <Link
                    href={getRoute('category.page', { category: website.category })}
                    className="group focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:rounded-md"
                  >
                    <Badge
                      variant="secondary"
                      className="inline-flex items-center gap-1.5 py-1.5 px-3 hover:bg-secondary/80 cursor-pointer transition-colors"
                    >
                      <Hash className="size-3.5" />
                      <span className="capitalize">{website.category.replace(/-/g, ' ')}</span>
                    </Badge>
                  </Link>
                )}
                {website.publishedAt && (
                  <Badge
                    variant="outline"
                    className="inline-flex items-center gap-1.5 py-1.5 px-3 text-muted-foreground"
                  >
                    <Calendar className="size-3.5" />
                    Added{' '}
                    {new Date(website.publishedAt).toLocaleDateString('en-US', {
                      month: 'short',
                      day: 'numeric',
                      year: 'numeric'
                    })}
                  </Badge>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
