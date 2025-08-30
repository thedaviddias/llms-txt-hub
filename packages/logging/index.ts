import { IS_DEVELOPMENT } from '@thedaviddias/utils/environment'
import { keys } from './keys'

type LogLevel = 'debug' | 'info' | 'warn' | 'error'

interface LogOptions {
  level?: LogLevel
  data?: unknown
  extra?: Record<string, unknown>
  tags?: Record<string, string>
  fingerprint?: string[]
}

// Lazy-loaded Sentry to avoid issues in environments where it's not available
let Sentry: typeof import('@sentry/nextjs') | false | null = null

async function getSentry() {
  if (Sentry === null) {
    try {
      Sentry = await import('@sentry/nextjs')
    } catch {
      // Sentry not available, continue without it
      Sentry = false
    }
  }
  return Sentry === false ? null : Sentry
}

const LOG_LEVELS: Record<LogLevel, number> = {
  debug: 0,
  info: 1,
  warn: 2,
  error: 3
}

function getMinLogLevel(): LogLevel {
  // Check if we're in a browser environment
  if (typeof window !== 'undefined') {
    // Client-side: default to error only
    return IS_DEVELOPMENT ? 'debug' : 'error'
  }

  // Server-side: use environment variable
  return (keys().LOG_LEVEL ?? 'error') as LogLevel
}

class Logger {
  private formatMessage(message: string, options?: LogOptions): string {
    const parts: string[] = []

    // Add timestamp in development
    if (IS_DEVELOPMENT) {
      parts.push(new Date().toISOString())
    }

    // Add level if provided
    if (options?.level) {
      parts.push(`[${options.level.toUpperCase()}]`)
    }

    // Add message
    parts.push(message)

    return parts.join(' ')
  }

  private shouldLog(level: LogLevel): boolean {
    // Always log errors
    if (level === 'error') {
      return true
    }

    // In development, log everything
    if (IS_DEVELOPMENT) {
      return true
    }

    // Respect the minimum log level based on environment
    return LOG_LEVELS[level] >= LOG_LEVELS[getMinLogLevel()]
  }

  debug(message: string, options?: Omit<LogOptions, 'level'>) {
    if (!this.shouldLog('debug')) {
      return
    }

    console.debug(this.formatMessage(message, { ...options, level: 'debug' }))
  }

  info(message: string, options?: Omit<LogOptions, 'level'>) {
    if (!this.shouldLog('info')) {
      return
    }

    console.info(this.formatMessage(message, { ...options, level: 'info' }))
  }

  warn(message: string, options?: Omit<LogOptions, 'level'>) {
    if (!this.shouldLog('warn')) {
      return
    }

    console.warn(this.formatMessage(message, { ...options, level: 'warn' }))
  }

  error(message: string | Error, options?: Omit<LogOptions, 'level'>) {
    // Always log errors
    const errorMessage = message instanceof Error ? message.message : message
    const errorStack = message instanceof Error ? message.stack : undefined
    const error = message instanceof Error ? message : new Error(errorMessage)

    // Console log for immediate visibility
    console.error(
      this.formatMessage(errorMessage, { ...options, level: 'error' }),
      errorStack ?? options?.data ?? ''
    )

    // Send to Sentry asynchronously (don't await to avoid blocking)
    this.sendToSentry(error, options).catch(() => {
      // Silently fail if Sentry is unavailable
    })
  }

  private async sendToSentry(error: Error, options?: Omit<LogOptions, 'level'>) {
    const sentry = await getSentry()
    if (!sentry) {
      return
    }

    try {
      sentry.withScope(scope => {
        // Add extra context
        if (options?.extra) {
          Object.keys(options.extra).forEach(key => {
            scope.setExtra(key, options.extra![key])
          })
        }

        // Add tags
        if (options?.tags) {
          Object.keys(options.tags).forEach(key => {
            scope.setTag(key, options.tags![key])
          })
        }

        // Add fingerprint for grouping
        if (options?.fingerprint) {
          scope.setFingerprint(options.fingerprint)
        }

        // Add data as context
        if (options?.data) {
          scope.setContext('data', {
            value: options.data,
            type: typeof options.data
          })
        }

        // Capture the error
        sentry.captureException(error)
      })
    } catch {
      // Silently fail if Sentry throws
    }
  }
}

export const logger = new Logger()

// Convenience function for easy migration from console.error
export const logError = (
  message: string | Error,
  data?: unknown,
  extra?: Record<string, unknown>
) => {
  logger.error(message, { data, extra })
}
