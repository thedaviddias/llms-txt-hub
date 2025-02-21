import { logger } from '@thedaviddias/logging'

/**
 * Log API request details
 */
export function logApiRequest(options: {
  request: Request
  response: Response
  startTime: number
  metadata?: Record<string, unknown>
}) {
  const { request, response, startTime, metadata } = options
  const duration = Date.now() - startTime

  logger.info('[API Monitoring] Request:', {
    data: {
      url: request.url,
      method: request.method,
      status: response.status,
      duration,
      environment: process.env.NODE_ENV,
      ...metadata
    }
  })
}

/**
 * Log API error details
 */
export function logApiError(
  error: Error,
  options: {
    request: Request
    response: Response
    metadata?: Record<string, unknown>
  }
) {
  const { request, response, metadata } = options

  logger.error('[API Monitoring] Error:', {
    data: {
      error,
      url: request.url,
      method: request.method,
      status: response.status,
      environment: process.env.NODE_ENV,
      ...metadata
    }
  })
}
