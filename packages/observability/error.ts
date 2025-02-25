import { captureException } from '@sentry/nextjs'
import { logger } from '@thedaviddias/logging'

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
    logger.error(`Parsing error: ${message}`)
  } catch (newError) {
    logger.error(`Error parsing error: ${newError}`)
  }

  return message
}
