import { Card, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { categories } from '@/lib/categories'
import { getRoute } from '@/lib/routes'
import Link from 'next/link'

/**
 * Renders a list of category cards, each linking to its category page.
 *
 * Iterates over the `categories` array and produces a clickable Card for each
 * category. Each card links to the route produced by `getRoute('category.page', { category: category.slug })`
 * and displays the category's icon, name, and description.
 *
 * Assumes each category object has the shape: `{ slug, icon, name, description }`.
 */
export function CategoryList() {
  return (
    <>
      {categories.map(category => (
        <Link key={category.slug} href={getRoute('category.page', { category: category.slug })}>
          <Card className="h-full transition-all hover:border-primary hover:bg-muted/50">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <category.icon className="h-5 w-5" />
                {category.name}
              </CardTitle>
              <CardDescription>{category.description}</CardDescription>
            </CardHeader>
          </Card>
        </Link>
      ))}
    </>
  )
}
