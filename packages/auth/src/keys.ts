import { createEnv } from '@t3-oss/env-nextjs'

export const keys = () =>
  createEnv({
    server: {},
    client: {},
    runtimeEnv: {}
  })
