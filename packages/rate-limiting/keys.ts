import { createEnv } from '@t3-oss/env-nextjs'
import { z } from 'zod'

export const keys = () =>
  createEnv({
    server: {
      STORAGE_REDIS_URL: z.string().min(1).url().optional(),
      STORAGE_KV_REST_API_TOKEN: z.string().min(1).optional()
    },
    runtimeEnv: {
      STORAGE_REDIS_URL: process.env.STORAGE_REDIS_URL,
      STORAGE_KV_REST_API_TOKEN: process.env.STORAGE_KV_REST_API_TOKEN
    }
  })
