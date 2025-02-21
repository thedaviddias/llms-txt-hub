import { getAllBlogPosts, getBlogPost } from "@/lib/blog"
import { formatDate } from "@/lib/utils"
import { Badge } from "@/components/ui/badge"
import { notFound } from "next/navigation"
import type { Metadata } from "next"

interface BlogPostPageProps {
  params: {
    slug: string
  }
}

export async function generateMetadata({ params }: BlogPostPageProps): Promise<Metadata> {
  const post = await getBlogPost(params.slug)

  if (!post) {
    return {}
  }

  return {
    title: post.title,
    description: post.excerpt,
  }
}

export async function generateStaticParams() {
  const posts = await getAllBlogPosts()
  return posts.map((post) => ({
    slug: post.slug,
  }))
}

export default async function BlogPostPage({ params }: BlogPostPageProps) {
  const post = await getBlogPost(params.slug)

  if (!post) {
    notFound()
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <article className="max-w-[900px] mx-auto">
        <div className="space-y-4 mb-8">
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <time className="text-sm text-muted-foreground" dateTime={post.date}>
                {formatDate(post.date)}
              </time>
              {post.category && <Badge variant="secondary">{post.category}</Badge>}
            </div>
            <h1 className="text-4xl font-bold">{post.title}</h1>
            {post.excerpt && <p className="text-xl text-muted-foreground">{post.excerpt}</p>}
          </div>
        </div>
        <div
          className="prose prose-gray dark:prose-invert max-w-none"
          dangerouslySetInnerHTML={{ __html: post.content }}
        />
      </article>
    </div>
  )
}

