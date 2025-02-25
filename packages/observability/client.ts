/*
 * This file configures the initialization of Sentry on the client.
 * The config you add here will be used whenever a users loads a page in their browser.
 * https://docs.sentry.io/platforms/javascript/guides/nextjs/
 */

import { init, replayIntegration } from '@sentry/nextjs'
import { IS_DEVELOPMENT } from '@thedaviddias/utils/environment'
import { keys } from './keys'

export const initializeSentry = (): ReturnType<typeof init> =>
  init({
    dsn: keys().NEXT_PUBLIC_SENTRY_DSN,

    // Set the environment
    environment: process.env.VERCEL_ENV || (IS_DEVELOPMENT ? 'development' : 'production'),

    // Adjust sampling rates based on environment
    tracesSampleRate: IS_DEVELOPMENT ? 1.0 : 0.1,

    // Setting this option to true will print useful information to the console while you're setting up Sentry.
    debug: IS_DEVELOPMENT,

    replaysOnErrorSampleRate: 1.0,

    /*
     * This sets the sample rate to be 10%. You may want this to be 100% while
     * in development and sample at a lower rate in production
     */
    replaysSessionSampleRate: IS_DEVELOPMENT ? 1.0 : 0.1,

    // You can remove this option if you're not planning to use the Sentry Session Replay feature:
    integrations: [
      replayIntegration({
        // Additional Replay configuration goes in here, for example:
        maskAllText: true,
        blockAllMedia: true
      })
    ],

    // Include environment in initial scope
    initialScope: {
      tags: {
        environment: process.env.VERCEL_ENV || (IS_DEVELOPMENT ? 'development' : 'production')
      }
    }
  })
