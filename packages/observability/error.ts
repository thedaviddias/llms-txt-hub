import { captureException } from '@sentry/nextjs'
import { log } from './log'

export const parseError = (error: unknown): string => {
  let message = 'An error occurred'

  if (error instanceof Error) {
    message = error.message
  } else if (error && typeof error === 'object' && 'message' in error) {
    message = error.message as string
  } else {
    message = String(error)
  }

  try {
    captureException(error)
    log.error(`Parsing error: ${message}`)
  } catch (newError) {
    log.error('Error parsing error:', { error: newError })
  }

  return message
}
