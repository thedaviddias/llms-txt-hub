import { Alert, AlertDescription, AlertTitle } from '@thedaviddias/design-system/alert'
import { AlertTriangle } from 'lucide-react'
import Link from 'next/link'
import { getRoute } from '@/lib/routes'

/**
 * Error display component for website pages
 * Shows when a website fails to load
 *
 * @returns Error alert component with navigation back to list
 */
export function WebsiteError() {
  return (
    <div className="container mx-auto px-6 py-8">
      <Alert variant="destructive" className="mb-6">
        <AlertTriangle className="h-4 w-4" />
        <AlertTitle>Error loading website</AlertTitle>
        <AlertDescription>
          There was a problem loading this website. Please try again later or{' '}
          <Link href={getRoute('website.list')} className="underline font-medium">
            return to the websites list
          </Link>
          .
        </AlertDescription>
      </Alert>
    </div>
  )
}
