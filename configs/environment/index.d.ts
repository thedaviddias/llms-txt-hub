import { z } from 'zod'

declare const env: {
  // Runtime
  VERCEL?: string
  NEXT_RUNTIME?: 'nodejs' | 'edge'

  // Database
  DATABASE_URL?: string

  // Auth
  CLERK_SECRET_KEY?: string
  CLERK_WEBHOOK_SECRET?: string
  SUPABASE_SERVICE_ROLE_KEY?: string

  // Security
  ARCJET_KEY?: string
  FLAGS_SECRET?: string

  // Cache
  UPSTASH_REDIS_REST_URL?: string
  UPSTASH_REDIS_REST_TOKEN?: string

  // Email
  RESEND_FROM?: string
  RESEND_TOKEN?: string

  // Monitoring
  SENTRY_ORG?: string
  SENTRY_PROJECT?: string
  BETTERSTACK_API_KEY?: string
  BETTERSTACK_URL?: string

  // URLs
  NEXT_PUBLIC_WEB_URL: string
  NEXT_PUBLIC_APP_URL?: string
  NEXT_PUBLIC_DOCS_URL?: string
  NEXT_PUBLIC_VERCEL_PROJECT_PRODUCTION_URL: string

  // Auth Public
  NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY?: string
  NEXT_PUBLIC_CLERK_SIGN_IN_URL?: string
  NEXT_PUBLIC_CLERK_SIGN_UP_URL?: string
  NEXT_PUBLIC_CLERK_AFTER_SIGN_IN_URL?: string
  NEXT_PUBLIC_CLERK_AFTER_SIGN_UP_URL?: string
  NEXT_PUBLIC_SUPABASE_URL: string
  NEXT_PUBLIC_SUPABASE_ANON_KEY: string

  // Analytics
  NEXT_PUBLIC_POSTHOG_KEY?: string
  NEXT_PUBLIC_POSTHOG_HOST?: string
  NEXT_PUBLIC_GA_MEASUREMENT_ID?: string
  NEXT_PUBLIC_VERCEL_ANALYTICS?: string

  // CMS
  BASEHUB_TOKEN?: string

  // AI
  OPENAI_API_KEY?: string

  // MailerLite
  MAILERLITE_API_KEY?: string

  // Webhooks
  SVIX_TOKEN?: string

  // Cloudinary
  CLOUDINARY_CLOUD_NAME?: string
  NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME?: string

  // Mapbox
  NEXT_PUBLIC_MAPBOX_TOKEN?: string

  // Build
  ANALYZE?: string

  // Logging
  LOG_LEVEL?: 'debug' | 'info' | 'warn' | 'error'
}

export { env }
