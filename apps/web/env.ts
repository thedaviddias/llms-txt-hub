import { createEnv } from '@t3-oss/env-nextjs'
import { keys as core } from '@thedaviddias/config-next/keys'
import { keys as logging } from '@thedaviddias/logging/keys'
import { keys as observability } from '@thedaviddias/observability/keys'
import { keys as supabase } from '@thedaviddias/supabase/keys'

export const env = createEnv({
  extends: [core(), observability(), supabase(), logging()],
  server: {},
  client: {},
  runtimeEnv: {}
})
