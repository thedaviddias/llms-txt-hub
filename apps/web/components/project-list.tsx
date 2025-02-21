import Image from "next/image"
import { FavoriteButton } from "@/components/buttons/favorite-button"
import { LLMButton } from "@/components/llm-button"
import { Badge } from "@/components/ui/badge"
import Link from "next/link"

interface ProjectListProps {
  items: Array<{
    slug: string
    name: string
    description: string
    website: string
    llmsUrl: string
    llmsFullUrl?: string
    category?: string
    favorites: number
  }>
}

function getFaviconUrl(website: string) {
  const domain = new URL(website).hostname
  return `https://www.google.com/s2/favicons?sz=32&domain=${domain}`
}

export function ProjectList({ items }: ProjectListProps) {
  return (
    <div className="space-y-4">
      {items.map((item) => (
        <div key={item.slug} className="relative border rounded-lg p-4 hover:bg-muted/50 transition-colors group">
          <Link href={`/project/${item.slug}`} className="absolute inset-0 z-10">
            <span className="sr-only">View project</span>
          </Link>
          <div className="flex items-start gap-4">
            <Image
              src={getFaviconUrl(item.website) || "/placeholder.svg"}
              alt={`${item.name} favicon`}
              width={32}
              height={32}
              className="rounded-sm"
            />
            <div className="grow">
              <div className="flex justify-between items-start">
                <div>
                  <h3 className="text-lg font-semibold group-hover:underline">{item.name}</h3>
                  <p className="text-sm text-muted-foreground mt-1">{item.description}</p>
                </div>
                <FavoriteButton projectSlug={item.slug} initialFavorites={item.favorites} className="relative z-20" />
              </div>
              <div className="mt-2 flex items-center gap-2">
                <LLMButton href={item.llmsUrl} type="llms" size="sm" className="relative z-20" />
                {item.llmsFullUrl && (
                  <LLMButton href={item.llmsFullUrl} type="llms-full" size="sm" className="relative z-20" />
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
      ))}
    </div>
  )
}

