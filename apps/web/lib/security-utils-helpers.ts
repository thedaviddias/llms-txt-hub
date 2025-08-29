/**
 * Helper functions for security utilities
 */

// Rate limiting map for in-memory storage (consider Redis for production)
export const rateLimitMap = new Map<string, { count: number; resetTime: number }>()

/**
 * Helper to sanitize error messages by removing sensitive information
 *
 * @param message - The error message to sanitize
 * @returns Sanitized error message
 */
export function sanitizeErrorMessage(message: string): string {
  // Remove potential sensitive data patterns
  let sanitized = message
    // Remove passwords
    .replace(/password[s]?[:\s]*[\S]+/gi, 'password: [REDACTED]')
    // Remove internal hosts/IPs
    .replace(
      /\b(?:db|database|host|server)[.\w-]*\.(?:internal|local|private)[.\w-]*/gi,
      '[INTERNAL_HOST]'
    )
    // Remove file paths
    .replace(/\/[\w/.-]+\.(js|ts|jsx|tsx)/g, '[FILE_PATH]')
    // Remove line numbers
    .replace(/:\d+:\d+/g, '')

  return sanitized
}

/**
 * Generate rate limit key from request
 *
 * @param request - The HTTP request
 * @param prefix - Prefix for the rate limit key
 * @returns Rate limit key
 */
export function getRateLimitKey(request: Request, prefix = 'ratelimit'): string {
  // Try to get IP from various headers
  const forwardedFor = request.headers.get('x-forwarded-for')
  const realIp = request.headers.get('x-real-ip')
  const ip = forwardedFor ? forwardedFor.split(',')[0].trim() : realIp || 'unknown'

  return `${prefix}:${ip}`
}

/**
 * Helper to clear rate limiting (for testing)
 *
 * @returns void
 */
export function clearRateLimiting() {
  rateLimitMap.clear()
}
