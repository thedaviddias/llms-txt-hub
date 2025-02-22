import { LLMGrid } from '@/components/llm-grid'
import { categories } from '@/lib/categories'
import { getAllWebsites } from '@/lib/mdx'
import { getRoute } from '@/lib/routes'
import { ChevronRight } from 'lucide-react'
import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'

interface CategoryPageProps {
  params: {
    slug: string
  }
}

export async function generateStaticParams() {
  return categories.map(category => ({
    slug: category.slug
  }))
}

export async function generateMetadata({ params }: CategoryPageProps): Promise<Metadata> {
  const category = categories.find(c => c.slug === params.slug)

  if (!category) {
    console.log('Category not found for slug:', params.slug)
    return {
      title: 'Category Not Found'
    }
  }

  return {
    title: `${category.name} - llms.txt Directory`,
    description: category.description
  }
}

export default async function CategoryPage({ params }: CategoryPageProps) {
  const category = categories.find(c => c.slug === params.slug)

  if (!category) {
    console.log('Category not found, calling notFound()')
    notFound()
  }

  const websites = await getAllWebsites()

  const categoryItems = websites.filter(website => website.category === params.slug)

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="max-w-[1200px] mx-auto space-y-8">
        <nav className="flex items-center gap-2 text-sm text-muted-foreground">
          <Link href={getRoute('home')} className="hover:text-foreground">
            Home
          </Link>
          <ChevronRight className="h-4 w-4" />
          <Link href={getRoute('category.list')} className="hover:text-foreground">
            Categories
          </Link>
          <ChevronRight className="h-4 w-4" />
          <span className="text-foreground">{category.name}</span>
        </nav>

        <div className="space-y-4">
          <div className="flex items-center gap-3">
            <category.icon className="h-8 w-8" />
            <h1 className="text-3xl font-bold">{category.name}</h1>
          </div>
          <p className="text-lg text-muted-foreground">{category.description}</p>
        </div>

        {categoryItems.length > 0 ? (
          <LLMGrid items={categoryItems} />
        ) : (
          <div className="text-center py-12">
            <p className="text-muted-foreground">No projects found in this category yet.</p>
            <Link href={getRoute('submit')} className="text-sm hover:underline mt-2 inline-block">
              Submit the first one →
            </Link>
          </div>
        )}
      </div>
    </div>
  )
}
