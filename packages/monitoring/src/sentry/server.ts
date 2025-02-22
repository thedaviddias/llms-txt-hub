import * as Sentry from '@sentry/nextjs'

type Parameters<T extends (args: never) => unknown> = T extends (...args: infer P) => unknown
  ? P
  : never

/**
 * @name initializeSentryServerClient
 * @description Initialize the Sentry client in the server
 * @param props
 */
export function initializeSentryServerClient(props: Parameters<typeof Sentry.init>[0] = {}) {
  return Sentry.init({
    dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,

    // Note: if you want to override the automatic release value, do not set a
    // `release` value here - use the environment variable `SENTRY_RELEASE`, so
    // that it will also get attached to your source maps,
    ...props
  })
}
