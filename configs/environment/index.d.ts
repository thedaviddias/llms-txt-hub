declare const env: {
  // Runtime
  VERCEL?: string
  NEXT_RUNTIME?: 'nodejs' | 'edge'

  // Auth
  SUPABASE_SERVICE_ROLE_KEY?: string

  // Security
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

  // Auth Public
  NEXT_PUBLIC_SUPABASE_URL: string
  NEXT_PUBLIC_SUPABASE_ANON_KEY: string

  // Analytics
  NEXT_PUBLIC_VERCEL_ANALYTICS?: string

  // MailerLite
  MAILERLITE_API_KEY?: string

  // Build
  ANALYZE?: string

  // Logging
  LOG_LEVEL?: 'debug' | 'info' | 'warn' | 'error'
}

export { env }
