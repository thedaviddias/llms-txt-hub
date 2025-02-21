import type { Metadata } from "next"
import Link from "next/link"
import { Card } from "@/components/ui/card"
import { ExternalLink, Rss } from "lucide-react"
import { formatDate } from "@/lib/utils"
import { Button } from "@/components/ui/button"

export const metadata: Metadata = {
  title: "Latest News - llms.txt hub",
  description: "Stay updated with the latest news and updates from the llms.txt community.",
}

async function getNewsItems() {
  const res = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL}/api/rss-feed`, { next: { revalidate: 3600 } })
  if (!res.ok) throw new Error("Failed to fetch news")
  return res.json()
}

export default async function NewsPage() {
  const { items } = await getNewsItems()

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="max-w-4xl mx-auto space-y-8">
        <div className="flex justify-between items-center">
          <h1 className="text-3xl font-bold">Latest News</h1>
          <Button asChild variant="outline">
            <Link href="/rss.xml">
              <Rss className="mr-2 h-4 w-4" />
              Follow RSS Feed
            </Link>
          </Button>
        </div>
        <div className="grid gap-6">
          {items.map((item: any, index: number) => (
            <Card key={index} className="p-6">
              <article className="space-y-4">
                <h2 className="text-xl font-semibold">
                  <Link href={item.link} className="hover:underline" target="_blank" rel="noopener noreferrer">
                    {item.title}
                    <ExternalLink className="inline-block ml-2 h-4 w-4" />
                  </Link>
                </h2>
                <p className="text-muted-foreground">{item.description}</p>
                <div className="flex justify-between items-center text-sm text-muted-foreground">
                  <time dateTime={item.pubDate}>{formatDate(item.pubDate)}</time>
                  <Link href={item.link} className="hover:underline" target="_blank" rel="noopener noreferrer">
                    Read more
                  </Link>
                </div>
              </article>
            </Card>
          ))}
        </div>
      </div>
    </div>
  )
}

