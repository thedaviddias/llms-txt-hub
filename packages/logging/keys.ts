import { createEnv } from '@t3-oss/env-nextjs'
import { z } from 'zod'

export const keys = () =>
  createEnv({
    server: {
      LOG_LEVEL: z.enum(['debug', 'info', 'warn', 'error']).optional()
    },
    runtimeEnv: {
      LOG_LEVEL: process.env.LOG_LEVEL
    }
  })
