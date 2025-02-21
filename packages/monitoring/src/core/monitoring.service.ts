import { logger } from '@thedaviddias/logging'

interface MonitoringOptions {
  name: string
  message?: string
  metadata?: Record<string, unknown>
}

/**
 * Log an error with monitoring metadata
 */
export function logError(error: Error, options?: MonitoringOptions) {
  logger.error('[Monitoring] Error:', {
    data: {
      error,
      ...options,
      environment: process.env.NODE_ENV
    }
  })
}

/**
 * Log an event with monitoring metadata
 */
export function logEvent(options: MonitoringOptions) {
  logger.info(`[Monitoring] ${options.message || options.name}`, {
    data: {
      ...options,
      environment: process.env.NODE_ENV
    }
  })
}
