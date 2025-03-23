import { init } from '@sentry/nextjs'
import { IS_DEVELOPMENT } from '@thedaviddias/utils/environment'
import { keys } from './keys'

const opts = {
  dsn: keys().NEXT_PUBLIC_SENTRY_DSN,

  // Set the environment
  environment: process.env.VERCEL_ENV || (IS_DEVELOPMENT ? 'development' : 'production'),

  // Adjust sampling rates based on environment
  tracesSampleRate: IS_DEVELOPMENT ? 1.0 : 0.1,

  // Only enable debug in development and when explicitly required
  // This fixes the "Cannot initialize SDK with `debug` option using a non-debug bundle" error
  debug: false
}

export const initializeSentry = () => {
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    init(opts)
  }

  if (process.env.NEXT_RUNTIME === 'edge') {
    init(opts)
  }
}
