import { LLMButton } from '@/components/buttons/llm-button'
import { getRoute } from '@/lib/routes'
import { Badge } from '@thedaviddias/design-system/badge'
import { getFaviconUrl } from '@thedaviddias/utils/get-favicon-url'
import Link from 'next/link'

interface ProjectListProps {
  items: Array<{
    slug: string
    name: string
    description: string
    website: string
    llmsUrl: string
    llmsFullUrl?: string
    category?: string
  }>
}

export function ProjectList({ items = [] }: ProjectListProps) {
  if (!items?.length) {
    return null
  }

  return (
    <div className="space-y-4">
      {items.map(item => {
        if (!item?.slug) return null
        return (
          <div
            key={item.slug}
            className="relative border rounded-lg p-4 hover:bg-muted/50 transition-colors group relative"
          >
            <div className="flex items-start gap-4">
              <img
                src={getFaviconUrl(item.website) || '/placeholder.svg'}
                alt={`${item.name} favicon`}
                width={32}
                height={32}
                className="rounded-sm"
              />
              <div className="grow">
                <div className="flex justify-between items-start">
                  <div>
                    <h3 className="text-lg font-semibold group-hover:underline">
                      <Link
                        href={getRoute('website.detail', { slug: item.slug })}
                        className="z-10 after:absolute after:inset-0 after:content-[''] z-10"
                      >
                        {item.name}
                      </Link>
                    </h3>
                    <p className="text-sm text-muted-foreground mt-1">{item.description}</p>
                  </div>
                </div>
                <div className="mt-2 flex items-center gap-2">
                  <LLMButton href={item.llmsUrl} type="llms" size="sm" className="relative z-20" />
                  {item.llmsFullUrl && (
                    <LLMButton
                      href={item.llmsFullUrl}
                      type="llms-full"
                      size="sm"
                      className="relative z-20"
                    />
                  )}
                  {item.category && (
                    <Badge variant="secondary" className="ml-2">
                      {item.category}
                    </Badge>
                  )}
                </div>
              </div>
            </div>
          </div>
        )
      })}
    </div>
  )
}
