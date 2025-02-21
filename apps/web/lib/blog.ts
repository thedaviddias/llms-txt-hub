import fs from 'node:fs'
import path from 'node:path'
import { getContentFilePath, getContentPath } from '@thedaviddias/utils/content-paths'
import matter from 'gray-matter'
import { remark } from 'remark'
import html from 'remark-html'

export interface BlogPost {
  slug: string
  title: string
  date: string
  category?: string
  excerpt?: string
  content: string
}

export async function getAllBlogPosts(): Promise<BlogPost[]> {
  const blogDirectory = getContentPath('blog')

  if (!fs.existsSync(blogDirectory)) {
    fs.mkdirSync(blogDirectory, { recursive: true })
  }

  const fileNames = fs.readdirSync(blogDirectory)
  const posts = fileNames.map((fileName) => {
    const slug = fileName.replace(/\.mdx$/, '')
    const fullPath = getContentFilePath('blog', fileName)
    const fileContents = fs.readFileSync(fullPath, 'utf8')
    const { data, content } = matter(fileContents)

    return {
      slug,
      title: data.title,
      date: data.date,
      category: data.category,
      excerpt: data.excerpt || `${content.slice(0, 150)}...`,
      content: content,
    } as BlogPost
  })

  return posts.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
}

export async function getBlogPost(slug: string): Promise<BlogPost | null> {
  const fullPath = getContentFilePath('blog', `${slug}.mdx`)

  if (!fs.existsSync(fullPath)) {
    return null
  }

  const fileContents = fs.readFileSync(fullPath, 'utf8')
  const { data, content } = matter(fileContents)

  // Process markdown content
  const processedContent = await remark().use(html).process(content)
  const contentHtml = processedContent.toString()

  return {
    slug,
    content: contentHtml,
    title: data.title,
    date: data.date,
    category: data.category,
    excerpt: data.excerpt,
  }
}
