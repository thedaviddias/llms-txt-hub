import type { ClerkClient } from '@clerk/backend'
import { createClerkClient } from '@clerk/backend'

let clerkClient: ClerkClient | null = null
let isInitialized = false

// Playwright CI fallback secret from apps/e2e/playwright.config.ci.ts.
// Treat it as "no real Clerk secret configured" to avoid external API calls in CI.
const PLAYWRIGHT_CI_FALLBACK_SECRET_KEY =
  'sk_test_AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA'

/**
 * Get a shared, lazily-initialized Clerk client instance
 * @returns The cached Clerk client or null if CLERK_SECRET_KEY is not configured
 */
export function getClerk(): ClerkClient | null {
  // Return early if already initialized (even if null)
  if (isInitialized) {
    return clerkClient
  }

  // Mark as initialized to avoid repeated attempts
  isInitialized = true

  // Check if the secret key is available
  const secretKey = process.env.CLERK_SECRET_KEY

  if (!secretKey || secretKey === PLAYWRIGHT_CI_FALLBACK_SECRET_KEY) {
    // Return null if no secret key is configured (e.g., in development without auth)
    return null
  }

  try {
    // Create and cache the client
    clerkClient = createClerkClient({
      secretKey
    })
    return clerkClient
  } catch {
    // If creation fails, return null and log the issue
    // We don't log the error details to avoid exposing sensitive information
    console.warn('Failed to initialize Clerk client. Authentication features may be unavailable.')
    return null
  }
}

/**
 * Safely serialize an error for logging
 * Extracts only non-sensitive information from errors
 * @param error - The error to serialize
 * @returns A safe object for logging
 */
export function safeSerializeError(error: unknown): Record<string, unknown> {
  if (error instanceof Error) {
    return {
      message: error.message,
      name: error.name,
      // Only include stack in development for debugging
      ...(process.env.NODE_ENV === 'development' && { stack: error.stack })
    }
  }

  // For non-Error objects, stringify safely
  if (typeof error === 'object' && error !== null) {
    try {
      // Attempt to extract safe properties
      return {
        type: 'unknown_error',
        message: String(error),
        // Avoid logging the raw object which might contain sensitive data
        details: 'Non-Error object thrown'
      }
    } catch {
      return {
        type: 'serialization_error',
        message: 'Failed to serialize error object'
      }
    }
  }

  // For primitive values
  return {
    type: 'primitive_error',
    value: String(error)
  }
}
