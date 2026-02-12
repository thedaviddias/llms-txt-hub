import * as p from '@clack/prompts'
import pc from 'picocolors'

/**
 * Log an informational message.
 */
export function info(message: string): void {
  p.log.info(message)
}

/**
 * Log a success message.
 */
export function success(message: string): void {
  p.log.success(message)
}

/**
 * Log a warning message.
 */
export function warn(message: string): void {
  p.log.warn(message)
}

/**
 * Log an error message.
 */
export function error(message: string): void {
  p.log.error(message)
}

/**
 * Log a dimmed message for secondary information.
 */
export function dim(message: string): void {
  p.log.message(pc.dim(message))
}

/**
 * Log a bold heading / step marker.
 */
export function heading(message: string): void {
  p.log.step(pc.bold(message))
}

/** Spinner that wraps @clack/prompts spinner with ora-compatible methods. */
export interface Spinner {
  /** Start the spinner with optional text override. */
  start(text?: string): void
  /** Stop the spinner. */
  stop(text?: string): void
  /** Stop with a green checkmark. */
  succeed(text: string): void
  /** Stop with a red cross. */
  fail(text: string): void
  /** Stop with an info icon. */
  info(text: string): void
  /** Stop with a warning icon. */
  warn(text: string): void
}

/**
 * Create a spinner with ora-compatible succeed/fail/info/warn methods.
 */
export function spinner(_text?: string): Spinner {
  const s = p.spinner()
  return {
    start(text?: string) {
      s.start(text || _text || '')
    },
    stop(text?: string) {
      s.stop(text || '')
    },
    succeed(text: string) {
      s.stop(`${pc.green('✓')} ${text}`)
    },
    fail(text: string) {
      s.stop(`${pc.red('✗')} ${text}`)
    },
    info(text: string) {
      s.stop(`${pc.blue('ℹ')} ${text}`)
    },
    warn(text: string) {
      s.stop(`${pc.yellow('⚠')} ${text}`)
    }
  }
}
