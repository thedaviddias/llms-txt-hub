import { createEnv } from '@t3-oss/env-nextjs'
import { keys as caching } from '@thedaviddias/caching/keys'
import { keys as core } from '@thedaviddias/config-next/keys'
import { keys as logging } from '@thedaviddias/logging/keys'
import { newsletterEnvSchema } from '@thedaviddias/newsletter/keys'
import { keys as observability } from '@thedaviddias/observability/keys'
import { keys as rateLimit } from '@thedaviddias/rate-limiting/keys'

export const env = createEnv({
  extends: [core(), observability(), logging(), rateLimit(), caching()],
  server: {
    ...newsletterEnvSchema
  },
  client: {},
  runtimeEnv: {
    // Newsletter env vars
    MAILERLITE_API_KEY: process.env.MAILERLITE_API_KEY,
    MAILERLITE_GROUP_IDS: process.env.MAILERLITE_GROUP_IDS,
    CONVERTKIT_API_KEY: process.env.CONVERTKIT_API_KEY,
    CONVERTKIT_FORM_ID: process.env.CONVERTKIT_FORM_ID,
    CONVERTKIT_TAG_IDS: process.env.CONVERTKIT_TAG_IDS,
    SUBSTACK_PUBLICATION_URL: process.env.SUBSTACK_PUBLICATION_URL,
    SUBSTACK_EMBED_URL: process.env.SUBSTACK_EMBED_URL,
  }
})
