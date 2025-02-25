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

const GlobalError = ({ error, reset }: GlobalErrorProperties) => {
  useEffect(() => {
    captureException(error)
  }, [error])

  return (
    <html lang="en" className={fonts}>
      <body>
        <h1>Oops, something went wrong</h1>
        <Button onClick={() => reset()}>Try again</Button>
      </body>
    </html>
  )
}

export default GlobalError
