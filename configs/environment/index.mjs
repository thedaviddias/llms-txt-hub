import { createEnv } from '@t3-oss/env-nextjs'
import { z } from 'zod'

// Validation groups
const url = () => z.string().min(1).url()
const email = () => z.string().min(1).email()
const path = () => z.string().min(1).startsWith('/')
const token = (prefix) => (prefix ? z.string().min(1).startsWith(prefix) : z.string().min(1))

const server = {
  // Runtime
  VERCEL: z.string().optional(),
  NEXT_RUNTIME: z.enum(['nodejs', 'edge']).optional(),

  // Auth
  SUPABASE_SERVICE_ROLE_KEY: token().optional(),

  // Security
  FLAGS_SECRET: token().optional(),

  // Cache
  UPSTASH_REDIS_REST_URL: url().optional(),
  UPSTASH_REDIS_REST_TOKEN: token().optional(),

  // Email
  RESEND_FROM: email().optional(),
  RESEND_TOKEN: token('re_').optional(),

  // Monitoring
  SENTRY_ORG: token().optional(),
  SENTRY_PROJECT: token().optional(),

  // MailerLite
  MAILERLITE_API_KEY: token(),

  // Build
  ANALYZE: z.string().optional(),

  // Logging
  LOG_LEVEL: z.enum(['debug', 'info', 'warn', 'error']).optional(),
}

const client = {
  // URLs
  NEXT_PUBLIC_WEB_URL: url(),

  // Auth
  NEXT_PUBLIC_SUPABASE_URL: url().optional(),
  NEXT_PUBLIC_SUPABASE_ANON_KEY: token().optional(),

  // Monitoring
  NEXT_PUBLIC_MONITORING_PROVIDER: z.enum(['sentry']).optional(),
}

export const env = createEnv({
  client,
  server,
  runtimeEnv: {
    // Runtime
    VERCEL: process.env.VERCEL,
    NEXT_RUNTIME: process.env.NEXT_RUNTIME,

    // Auth
    NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
    NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    SUPABASE_SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY,

    // Security
    FLAGS_SECRET: process.env.FLAGS_SECRET,

    // Cache
    UPSTASH_REDIS_REST_URL: process.env.UPSTASH_REDIS_REST_URL,
    UPSTASH_REDIS_REST_TOKEN: process.env.UPSTASH_REDIS_REST_TOKEN,

    // Email
    RESEND_FROM: process.env.RESEND_FROM,
    RESEND_TOKEN: process.env.RESEND_TOKEN,

    // Monitoring
    SENTRY_ORG: process.env.SENTRY_ORG,
    SENTRY_PROJECT: process.env.SENTRY_PROJECT,

    // URLs
    NEXT_PUBLIC_WEB_URL: process.env.NEXT_PUBLIC_WEB_URL,

    // Analytics

    // MailerLite
    MAILERLITE_API_KEY: process.env.MAILERLITE_API_KEY,
    // Build
    ANALYZE: process.env.ANALYZE,

    // Logging
    LOG_LEVEL: process.env.LOG_LEVEL,
  },
})
