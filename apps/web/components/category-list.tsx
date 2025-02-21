import { categories } from '@/lib/categories'
import { Card, CardDescription, CardHeader, CardTitle } from '@thedaviddias/design-system/card'
import Link from 'next/link'

export function CategoryList() {
  return (
    <>
      {categories.map((category) => (
        <Link key={category.slug} href={`/category/${category.slug}`}>
          <Card className="h-full hover:bg-muted/50 transition-colors">
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
