import { getAllBlogPosts } from '@/lib/blog'
import { formatDate } from '@/lib/utils'
import { Badge } from '@thedaviddias/design-system/badge'
import { Breadcrumb } from '@thedaviddias/design-system/breadcrumb'
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle
} from '@thedaviddias/design-system/card'
import { getBaseUrl } from '@thedaviddias/utils/get-base-url'
import type { Metadata } from 'next'
import Link from 'next/link'

export const metadata: Metadata = {
  title: 'Blog - llms.txt hub',
  description: 'Latest updates, guides, and news about llms.txt and AI documentation.'
}

export default async function BlogPage() {
  const posts = await getAllBlogPosts()

  return (
    <div className="max-w-6xl mx-auto px-4 py-8">
      <div className="mx-auto space-y-8">
        <Breadcrumb items={[{ name: 'Blog', href: '/blog' }]} baseUrl={getBaseUrl()} />
        <div className="space-y-4">
          <h1 className="text-4xl font-bold">Blog</h1>
          <p className="text-lg text-muted-foreground">
            Latest updates, guides, and news about llms.txt
          </p>
        </div>

        <div className="grid gap-6">
          {posts?.map(post => (
            <Card key={post.slug}>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div className="space-y-1">
                    <CardTitle className="text-2xl">
                      <Link href={`/blog/${post.slug}`} className="hover:underline">
                        {post.title}
                      </Link>
                    </CardTitle>
                    <CardDescription>{formatDate(post.date)}</CardDescription>
                  </div>
                  {post.category && <Badge variant="secondary">{post.category}</Badge>}
                </div>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground">{post.excerpt}</p>
              </CardContent>
              <CardFooter>
                <Link href={`/blog/${post.slug}`} className="text-sm hover:underline">
                  Read more
                </Link>
              </CardFooter>
            </Card>
          ))}
        </div>
      </div>
    </div>
  )
}
