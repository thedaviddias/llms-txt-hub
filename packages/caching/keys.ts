import { createEnv } from '@t3-oss/env-nextjs'
import { z } from 'zod'

/**
 * Validated Upstash Redis environment variables
 */
export const keys = () =>
  createEnv({
    server: {
      KV_REST_API_URL: z.string().min(1).url().optional(),
      KV_REST_API_TOKEN: z.string().min(1).optional()
    },
    runtimeEnv: {
      KV_REST_API_URL: process.env.KV_REST_API_URL,
      KV_REST_API_TOKEN: process.env.KV_REST_API_TOKEN
    }
  })
