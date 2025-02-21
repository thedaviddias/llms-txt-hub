import { categories } from '@/lib/categories'
import Link from 'next/link'

export default function CategoryIndexPage() {
  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold mb-6">Categories</h1>
      <ul className="space-y-4">
        {categories.map(category => (
          <li key={category.slug}>
            <Link href={`/category/${category.slug}`} className="text-blue-500 hover:underline">
              {category.name}
            </Link>
          </li>
        ))}
      </ul>
    </div>
  )
}
