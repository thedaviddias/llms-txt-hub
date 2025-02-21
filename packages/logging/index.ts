import { env } from '@thedaviddias/config-environment'
import { IS_DEVELOPMENT } from '@thedaviddias/utils/environment'

type LogLevel = 'debug' | 'info' | 'warn' | 'error'

interface LogOptions {
  level?: LogLevel
  data?: unknown
}

const LOG_LEVELS: Record<LogLevel, number> = {
  debug: 0,
  info: 1,
  warn: 2,
  error: 3,
}

function getMinLogLevel(): LogLevel {
  // Check if we're in a browser environment
  if (typeof window !== 'undefined') {
    // Client-side: default to error only
    return IS_DEVELOPMENT ? 'debug' : 'error'
  }

  // Server-side: use environment variable
  return (env.LOG_LEVEL ?? 'error') as LogLevel
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

    // biome-ignore lint: we want to use console here
    console.debug(this.formatMessage(message, { ...options, level: 'debug' }))
  }

  info(message: string, options?: Omit<LogOptions, 'level'>) {
    if (!this.shouldLog('info')) {
      return
    }

    // biome-ignore lint: we want to use console here
    console.info(this.formatMessage(message, { ...options, level: 'info' }))
  }

  warn(message: string, options?: Omit<LogOptions, 'level'>) {
    if (!this.shouldLog('warn')) {
      return
    }

    // biome-ignore lint: we want to use console here
    console.warn(this.formatMessage(message, { ...options, level: 'warn' }))
  }

  error(message: string | Error, options?: Omit<LogOptions, 'level'>) {
    // Always log errors
    const errorMessage = message instanceof Error ? message.message : message
    const errorStack = message instanceof Error ? message.stack : undefined

    // biome-ignore lint: we want to use console here
    console.error(
      this.formatMessage(errorMessage, { ...options, level: 'error' }),
      errorStack ?? options?.data ?? '',
    )
  }
}

export const logger = new Logger()
