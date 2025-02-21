import { readFile, readdir } from 'node:fs/promises'
import { join } from 'node:path'
import matter from 'gray-matter'
import { cache } from 'react'

export interface BlogPost {
  slug: string
  title: string
  date: string
  category?: string
  excerpt?: string
  content: string
}

/**
 * Retrieves all blog posts from the content directory
 * Uses node:fs for better build-time compatibility
 *
 * @returns Promise<BlogPost[]> Array of blog posts sorted by date
 * @throws Error if unable to read blog posts
 */
export const getAllBlogPosts = cache(async (): Promise<BlogPost[]> => {
  try {
    // Use process.cwd() to get the correct build-time path
    const blogDirectory = join(process.cwd(), 'content', 'blog')

    let fileNames: string[]
    try {
      fileNames = await readdir(blogDirectory)
    } catch (error) {
      console.log('No blog posts directory found')
      return []
    }

    if (fileNames.length === 0) {
      return []
    }

    const posts = await Promise.all(
      fileNames
        .filter(fileName => fileName.endsWith('.mdx'))
        .map(async fileName => {
          try {
            const fullPath = join(blogDirectory, fileName)
            const fileContents = await readFile(fullPath, 'utf8')
            const { data, content } = matter(fileContents)

            if (!data.title || !data.date) {
              console.warn(`Skipping ${fileName}: Missing required fields`)
              return null
            }

            return {
              slug: fileName.replace(/\.mdx$/, ''),
              title: data.title,
              date: data.date,
              category: data.category,
              excerpt: data.excerpt || `${content.slice(0, 150)}...`,
              content
            } as BlogPost
          } catch (error) {
            console.error(`Error processing ${fileName}:`, error)
            return null
          }
        })
    )

    return posts
      .filter((post): post is BlogPost => post !== null)
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
  } catch (error) {
    console.error('Failed to get blog posts:', error)
    return []
  }
})

/**
 * Get a single blog post by slug
 */
export async function getBlogPost(slug: string): Promise<BlogPost | null> {
  try {
    const posts = await getAllBlogPosts()
    return posts.find(post => post.slug === slug) ?? null
  } catch {
    return null
  }
}
