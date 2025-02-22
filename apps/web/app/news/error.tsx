'use client'

import { Button } from '@thedaviddias/design-system/button'
import { AlertCircle } from 'lucide-react'
import { useEffect } from 'react'

export default function NewsError({
  error,
  reset
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    console.error('News page error:', error)
  }, [error])

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="max-w-4xl mx-auto text-center space-y-4">
        <div className="flex justify-center">
          <AlertCircle className="h-12 w-12 text-destructive" />
        </div>
        <h2 className="text-2xl font-bold">Something went wrong!</h2>
        <p className="text-muted-foreground">Failed to load news items. Please try again later.</p>
        <Button onClick={reset}>Try again</Button>
      </div>
    </div>
  )
}
