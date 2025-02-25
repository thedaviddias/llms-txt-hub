import { init } from '@sentry/nextjs'
import { IS_DEVELOPMENT } from '@thedaviddias/utils/environment'
import { keys } from './keys'

const opts = {
  dsn: keys().NEXT_PUBLIC_SENTRY_DSN,

  // Set the environment
  environment: process.env.VERCEL_ENV || (IS_DEVELOPMENT ? 'development' : 'production'),

  // Adjust sampling rates based on environment
  tracesSampleRate: IS_DEVELOPMENT ? 1.0 : 0.1,

  // Setting this option to true will print useful information to the console while you're setting up Sentry.
  debug: IS_DEVELOPMENT
}

export const initializeSentry = () => {
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    init(opts)
  }

  if (process.env.NEXT_RUNTIME === 'edge') {
    init(opts)
  }
}
