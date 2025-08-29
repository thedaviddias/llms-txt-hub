import { createEnv } from '@t3-oss/env-nextjs'
import { keys as caching } from '@thedaviddias/caching/keys'
import { keys as core } from '@thedaviddias/config-next/keys'
import { keys as logging } from '@thedaviddias/logging/keys'
import { keys as observability } from '@thedaviddias/observability/keys'
import { keys as rateLimit } from '@thedaviddias/rate-limiting/keys'

export const env = createEnv({
  extends: [core(), observability(), logging(), rateLimit(), caching()],
  server: {},
  client: {},
  runtimeEnv: {}
})
