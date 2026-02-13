/**
 * Helper functions for security utilities
 */

// Rate limiting map for in-memory storage (consider Redis for production)
export const rateLimitMap = new Map<string, { count: number; resetTime: number }>()

/**
 * Input interface for rate limiting check
 */
export interface CheckRateLimitInput {
  identifier: string
  windowMs?: number
  maxRequests?: number
}

/**
 * Result interface for rate limiting check
 */
export interface CheckRateLimitResult {
  allowed: boolean
  resetTime: number
}

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

/**
 * Escape HTML entities to prevent XSS
 *
 * @param text - The text to escape
 * @returns HTML-escaped string
 */
export function escapeHtml(text: string | number | null | undefined): string {
  // Handle non-string inputs
  if (text === null || text === undefined) return ''
  if (typeof text === 'number') return String(text)
  if (typeof text !== 'string') return ''

  // First escape basic HTML entities
  let escaped = text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;')

  // Only escape forward slashes in closing script tags for XSS prevention
  escaped = escaped.replace(/&lt;\/script/gi, '&lt;&#x2F;script')

  return escaped
}

/**
 * Check rate limit for a given identifier
 *
 * @param input - Rate limiting input with identifier and options
 * @returns Object indicating if request is allowed with reset time
 */
export function checkRateLimit(input: CheckRateLimitInput): CheckRateLimitResult {
  // Validate identifier is present
  if (!input.identifier || typeof input.identifier !== 'string') {
    throw new Error('Rate limit identifier is required and must be a string')
  }

  // Coerce and validate windowMs with default 60000
  const windowMs = Number(input.windowMs)
  const validWindowMs = Number.isInteger(windowMs) && windowMs > 0 ? windowMs : 60000

  // Coerce and validate maxRequests with default 10
  const maxRequests = Number(input.maxRequests)
  const validMaxRequests = Number.isInteger(maxRequests) && maxRequests > 0 ? maxRequests : 10

  const identifier = input.identifier
  const now = Date.now()

  const record = rateLimitMap.get(identifier)

  if (!record || now > record.resetTime) {
    // First request or window expired
    const resetTime = now + validWindowMs
    rateLimitMap.set(identifier, {
      count: 1,
      resetTime
    })
    return { allowed: true, resetTime }
  }

  if (record.count < validMaxRequests) {
    // Within limit
    record.count++
    return { allowed: true, resetTime: record.resetTime }
  }

  // Rate limit exceeded
  return { allowed: false, resetTime: record.resetTime }
}
