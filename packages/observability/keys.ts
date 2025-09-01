import { createEnv } from '@t3-oss/env-nextjs'
import { z } from 'zod'

/**
 * Builds the Observability env contract (server/client) and parses process.env.
 * @returns Parsed env accessors for Sentry configuration.
 */
export const keys = () =>
  createEnv({
    server: {
      SENTRY_ORG: z.string().trim().min(1).optional(),
      SENTRY_PROJECT: z.string().trim().min(1).optional(),
      SENTRY_AUTH_TOKEN: z.string().trim().min(1).optional()
    },
    client: {
      NEXT_PUBLIC_SENTRY_DSN: z.string().trim().url().optional()
    },
    runtimeEnv: {
      SENTRY_ORG: process.env.SENTRY_ORG,
      SENTRY_PROJECT: process.env.SENTRY_PROJECT,
      NEXT_PUBLIC_SENTRY_DSN: process.env.NEXT_PUBLIC_SENTRY_DSN,
      SENTRY_AUTH_TOKEN: process.env.SENTRY_AUTH_TOKEN
    }
  })
