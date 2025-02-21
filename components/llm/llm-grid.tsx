import type { ProjectMetadata } from "@/lib/project-utils"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import Link from "next/link"
import { FavoriteButton } from "@/components/buttons/favorite-button"
import { LLMButton } from "@/components/llm-button"
import Image from "next/image"
import { formatDate } from "@/lib/utils"

interface LLMGridProps {
  items: ProjectMetadata[]
  variant?: "default" | "compact"
}

function getFaviconUrl(website: string) {
  const domain = new URL(website).hostname
  return `https://www.google.com/s2/favicons?sz=32&domain=${domain}`
}

export default function LLMGrid({ items, variant = "default" }: LLMGridProps) {
  if (!items || items.length === 0) {
    return <p>No projects available.</p>
  }

  return (
    <div className="grid sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
      {items.map((item) => (
        <Card key={item.slug} className="flex flex-col relative group">
          <Link href={`/project/${item.slug}`} className="absolute inset-0 z-10">
            <span className="sr-only">View project</span>
          </Link>
          <CardHeader>
            <div className="flex items-center gap-2 mb-2">
              <Image
                src={getFaviconUrl(item.website) || "/placeholder.svg"}
                alt={`${item.name} favicon`}
                width={16}
                height={16}
                className="rounded-sm"
              />
              <CardTitle className="text-lg font-semibold group-hover:underline">{item.name}</CardTitle>
            </div>
            {variant === "default" && <CardDescription>{item.description}</CardDescription>}
          </CardHeader>
          <CardContent className="flex-grow">
            {variant === "default" && (
              <div className="space-y-2">
                <p className="text-sm">
                  <strong>Website:</strong> <span className="hover:underline">{item.website}</span>
                </p>
              </div>
            )}
            {item.category && (
              <Badge variant="secondary" className="mt-2">
                {item.category}
              </Badge>
            )}
          </CardContent>
          <CardFooter className="flex justify-between items-center">
            <span className="text-sm text-muted-foreground">Last updated: {formatDate(item.lastUpdated)}</span>
            <div className="flex items-center gap-2 z-20">
              <LLMButton href={item.llmsUrl} type="llms" size="sm" />
              {item.llmsFullUrl && <LLMButton href={item.llmsFullUrl} type="llms-full" size="sm" />}
              <FavoriteButton projectSlug={item.slug} initialFavorites={isNaN(item.favorites) ? 0 : item.favorites} />
            </div>
          </CardFooter>
        </Card>
      ))}
    </div>
  )
}

