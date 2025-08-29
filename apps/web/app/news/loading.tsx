import { Button } from '@thedaviddias/design-system/button'
import { Skeleton } from '@thedaviddias/design-system/skeleton'
import { Rss } from 'lucide-react'
import { Card } from '@/components/ui/card'

export default function Loading() {
  return (
    <div className="container mx-auto px-4 py-8">
      <div className="max-w-6xl mx-auto space-y-8">
        <div className="flex justify-between items-center">
          <Skeleton className="h-10 w-48" />
          <Button variant="outline" disabled>
            <Rss className="mr-2 size-4" />
            Follow RSS Feed
          </Button>
        </div>
        <div className="grid gap-6">
          {Array.from({ length: 5 }).map((_, index) => (
            <Card key={index} className="p-6">
              <div className="space-y-4">
                <Skeleton className="h-6 w-3/4" />
                <Skeleton className="h-20 w-full" />
                <div className="flex justify-between items-center">
                  <Skeleton className="h-4 w-24" />
                  <Skeleton className="h-4 w-16" />
                </div>
              </div>
            </Card>
          ))}
        </div>
      </div>
    </div>
  )
}
