'use client'

import { captureException } from '@sentry/nextjs'
import { Button } from '@thedaviddias/design-system/button'
import { fonts } from '@thedaviddias/design-system/lib/fonts'
import type NextError from 'next/error'
import { useEffect } from 'react'

type GlobalErrorProperties = {
  readonly error: NextError & { digest?: string }
  readonly reset: () => void
}

/**
 * Global error boundary component that captures exceptions and provides a reset action
 *
 * @param props - Error properties containing the error and reset function
 * @returns Error page with retry button
 */
const GlobalError = ({ error, reset }: GlobalErrorProperties) => {
  useEffect(() => {
    captureException(error)
  }, [error])

  return (
    <html lang="en" className={fonts}>
      <body>
        <h1 className="text-3xl font-bold text-center mt-8">Oops, something went wrong</h1>
        <Button onClick={() => reset()}>Try again</Button>
      </body>
    </html>
  )
}

export default GlobalError
