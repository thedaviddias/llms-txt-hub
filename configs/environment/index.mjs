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
  ARCJET_KEY: token('ajkey_').optional(),
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

  // AI
  OPENAI_API_KEY: token('sk-').optional(),

  // MailerLite
  MAILERLITE_API_KEY: token(),

  // Webhooks
  SVIX_TOKEN: token().optional(),

  // Cloudinary
  CLOUDINARY_CLOUD_NAME: token().optional(),

  // Build
  ANALYZE: z.string().optional(),

  // Logging
  LOG_LEVEL: z.enum(['debug', 'info', 'warn', 'error']).optional(),
}

const client = {
  // URLs
  NEXT_PUBLIC_WEB_URL: url(),
  NEXT_PUBLIC_VERCEL_PROJECT_PRODUCTION_URL: url(),

  // Auth
  NEXT_PUBLIC_SUPABASE_URL: url().optional(),
  NEXT_PUBLIC_SUPABASE_ANON_KEY: token().optional(),

  // Analytics
  NEXT_PUBLIC_POSTHOG_KEY: token('phc_').optional(),
  NEXT_PUBLIC_POSTHOG_HOST: url().optional(),
  NEXT_PUBLIC_GA_MEASUREMENT_ID: token().optional(),

  // Monitoring
  NEXT_PUBLIC_MONITORING_PROVIDER: z.enum(['sentry']).optional(),

  // Cloudinary
  NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME: token().optional(),

  // Mapbox
  NEXT_PUBLIC_MAPBOX_TOKEN: token(),
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
    ARCJET_KEY: process.env.ARCJET_KEY,
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
    BETTERSTACK_API_KEY: process.env.BETTERSTACK_API_KEY,
    BETTERSTACK_URL: process.env.BETTERSTACK_URL,
    NEXT_PUBLIC_MONITORING_PROVIDER: process.env.NEXT_PUBLIC_MONITORING_PROVIDER,

    // URLs
    NEXT_PUBLIC_WEB_URL: process.env.NEXT_PUBLIC_WEB_URL,
    NEXT_PUBLIC_APP_URL: process.env.NEXT_PUBLIC_APP_URL,
    NEXT_PUBLIC_DOCS_URL: process.env.NEXT_PUBLIC_DOCS_URL,
    NEXT_PUBLIC_VERCEL_PROJECT_PRODUCTION_URL:
      process.env.NEXT_PUBLIC_VERCEL_PROJECT_PRODUCTION_URL,

    // Analytics
    NEXT_PUBLIC_POSTHOG_KEY: process.env.NEXT_PUBLIC_POSTHOG_KEY,
    NEXT_PUBLIC_POSTHOG_HOST: process.env.NEXT_PUBLIC_POSTHOG_HOST,
    NEXT_PUBLIC_GA_MEASUREMENT_ID: process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID,

    // AI
    OPENAI_API_KEY: process.env.OPENAI_API_KEY,

    // MailerLite
    MAILERLITE_API_KEY: process.env.MAILERLITE_API_KEY,

    // Webhooks
    SVIX_TOKEN: process.env.SVIX_TOKEN,

    // Cloudinary
    CLOUDINARY_CLOUD_NAME: process.env.CLOUDINARY_CLOUD_NAME,
    NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME: process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME,

    // Mapbox
    NEXT_PUBLIC_MAPBOX_TOKEN: process.env.NEXT_PUBLIC_MAPBOX_TOKEN,

    // Build
    ANALYZE: process.env.ANALYZE,

    // Logging
    LOG_LEVEL: process.env.LOG_LEVEL,
  },
})
