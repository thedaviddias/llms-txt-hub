import { ErrorBoundary } from '@thedaviddias/monitoring/components'
import { Alert, AlertDescription, AlertTitle } from 'components/shadcn/alert'
import { Button } from 'components/shadcn/button'
import { RefreshCw } from 'lucide-react'
import type { ReactNode } from 'react'

type ErrorBoundaryCustomProps = {
  children: ReactNode
}

export const ErrorBoundaryCustom = ({ children }: ErrorBoundaryCustomProps) => {
  return (
    <ErrorBoundary
      fallback={
        <div className="flex min-h-[400px] items-center justify-center p-4">
          <Alert className="max-w-lg">
            <AlertTitle>Something went wrong</AlertTitle>
            <AlertDescription className="mt-2">
              <p className="mb-4 text-muted-foreground">
                We apologize for the inconvenience. Please try refreshing the page.
              </p>
              <Button onClick={() => window.location.reload()} variant="outline" className="gap-2">
                <RefreshCw className="h-4 w-4" />
                Refresh Page
              </Button>
            </AlertDescription>
          </Alert>
        </div>
      }
    >
      {children}
    </ErrorBoundary>
  )
}
