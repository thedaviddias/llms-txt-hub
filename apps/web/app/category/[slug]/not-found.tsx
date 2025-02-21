import { Button } from '@thedaviddias/design-system/button'
import Link from 'next/link'

export default function NotFound() {
  return (
    <div className="container mx-auto px-4 py-16 text-center">
      <h1 className="text-4xl font-bold mb-4">Category Not Found</h1>
      <p className="text-xl text-muted-foreground mb-8">
        Sorry, we couldn't find the category you're looking for.
      </p>
      <div className="flex justify-center gap-4">
        <Button asChild>
          <Link href="/">Go Home</Link>
        </Button>
        <Button asChild variant="outline">
          <Link href="/category">View All Categories</Link>
        </Button>
      </div>
    </div>
  )
}
