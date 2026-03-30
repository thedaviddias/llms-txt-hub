'use client'

import { captureException } from '@sentry/nextjs'
import { Button } from '@thedaviddias/design-system/button'
import { fonts } from '@thedaviddias/design-system/lib/fonts'
import type { ErrorInfo } from 'next/error'
import { useEffect } from 'react'

/**
 * Global error boundary component that captures exceptions and provides a retry action
 *
 * @param props - Error properties containing the error and unstable_retry function
 * @returns Error page with retry button
 */
const GlobalError = ({ error, unstable_retry }: ErrorInfo) => {
  useEffect(() => {
    captureException(error)
  }, [error])

  return (
    <html lang="en" className={fonts}>
      <body>
        <h1 className="text-3xl font-bold text-center mt-8">Oops, something went wrong</h1>
        <Button onClick={() => unstable_retry()}>Try again</Button>
      </body>
    </html>
  )
}

export default GlobalError
