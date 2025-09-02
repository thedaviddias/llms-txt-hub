/**
 * Environment configuration validation and security
 * This file ensures that sensitive environment variables are properly handled
 */

/**
 * Public environment variables (safe to expose to client)
 */
export const publicEnv = {
  NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY: process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY,
  NEXT_PUBLIC_SENTRY_DSN: process.env.NEXT_PUBLIC_SENTRY_DSN,
  NODE_ENV: process.env.NODE_ENV
}

/**
 * Server-only environment variables (never expose to client)
 * These should only be accessed on the server side
 */
export const serverEnv = {
  CLERK_SECRET_KEY: process.env.CLERK_SECRET_KEY,
  GITHUB_TOKEN: process.env.GITHUB_TOKEN,
  RESEND_TOKEN: process.env.RESEND_TOKEN,
  SENTRY_AUTH_TOKEN: process.env.SENTRY_AUTH_TOKEN,
  STORAGE_REDIS_URL: process.env.STORAGE_REDIS_URL,
  STORAGE_KV_REST_API_TOKEN: process.env.STORAGE_KV_REST_API_TOKEN,
  FLAGS_SECRET: process.env.FLAGS_SECRET,
  GITHUB_CLIENT_SECRET: process.env.GITHUB_CLIENT_SECRET,
  MAILERLITE_API_KEY: process.env.MAILERLITE_API_KEY
}

/**
 * Validate that required environment variables are present
 */
export function validateEnvironmentVariables(): void {
  const requiredServerEnv = ['CLERK_SECRET_KEY'] as const

  const requiredPublicEnv = ['NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY'] as const

  const missing: string[] = []

  // Check required server environment variables
  for (const key of requiredServerEnv) {
    if (!serverEnv[key]) {
      missing.push(key)
    }
  }

  // Check required public environment variables
  for (const key of requiredPublicEnv) {
    if (!publicEnv[key]) {
      missing.push(key)
    }
  }

  if (missing.length > 0) {
    throw new Error(
      `Missing required environment variables: ${missing.join(', ')}. Please check your .env.local file and ensure all required variables are set.`
    )
  }
}

/**
 * Check if we're running in development mode
 */
export const isDevelopment = process.env.NODE_ENV === 'development'

/**
 * Check if we're running in production mode
 */
export const isProduction = process.env.NODE_ENV === 'production'

/**
 * Get a safe version of server environment variables for logging
 * This masks sensitive values to prevent accidental exposure in logs
 */
export function getSafeEnvForLogging(): Record<string, string> {
  const safeEnv: Record<string, string> = {}

  // Show only non-sensitive public env vars
  safeEnv.NODE_ENV = publicEnv.NODE_ENV || 'unknown'

  // Mask sensitive variables
  for (const [key, value] of Object.entries(serverEnv)) {
    if (value) {
      // Show first 4 and last 4 characters, mask the rest
      if (value.length > 8) {
        safeEnv[key] = `${value.slice(0, 4)}${'*'.repeat(value.length - 8)}${value.slice(-4)}`
      } else {
        safeEnv[key] = '*'.repeat(value.length)
      }
    } else {
      safeEnv[key] = 'NOT_SET'
    }
  }

  return safeEnv
}

// Validate environment variables on module load (server-side only)
if (typeof window === 'undefined') {
  validateEnvironmentVariables()
}
