/**
 * Security utilities for input validation and sanitization
 */
import validator from 'validator'
import { sanitizeErrorMessage, stripHtml } from './security-utils-helpers'

// Re-export helpers for backward compatibility
export {
  checkRateLimit,
  clearRateLimiting,
  escapeHtml,
  getRateLimitKey,
  stripHtml
} from './security-utils-helpers'

/**
 * Sanitize text input to prevent XSS attacks
 */
export function sanitizeText(input: string | null | undefined): string | null {
  if (input === null || input === undefined) return null
  if (input === '') return ''

  const cleaned = stripHtml(input)

  // Additional sanitization: remove zero-width characters but preserve line breaks
  return cleaned
    .replace(/\u200B|\u200C|\u200D|\uFEFF/g, '') // Remove zero-width characters
    .trim()
}

/**
 * Validate and sanitize URL
 */
export function sanitizeUrl(url: string | null | undefined): string | null {
  if (!url) return null

  const trimmed = url.trim()

  // Validate URL format
  if (
    !validator.isURL(trimmed, {
      protocols: ['http', 'https'],
      require_protocol: true,
      require_valid_protocol: true,
      allow_query_components: true,
      allow_fragments: true,
      allow_underscores: true,
      disallow_auth: false,
      require_tld: false // Allow localhost and IP addresses
    })
  ) {
    throw new Error('Invalid URL format')
  }

  // Additional check for malicious URLs
  const lowerUrl = trimmed.toLowerCase()
  if (
    lowerUrl.includes('javascript:') ||
    lowerUrl.includes('data:') ||
    lowerUrl.includes('vbscript:') ||
    lowerUrl.includes('file:')
  ) {
    throw new Error('Invalid URL protocol')
  }

  return trimmed
}

/**
 * Validate username format
 */
export function validateUsername(username: string): { valid: boolean; error?: string } {
  if (!username) {
    return { valid: false, error: 'Username is required' }
  }

  const sanitized = sanitizeText(username)
  if (!sanitized) {
    return { valid: false, error: 'Username cannot be empty' }
  }

  if (sanitized.length < 3) {
    return { valid: false, error: 'Username must be at least 3 characters' }
  }

  if (sanitized.length > 30) {
    return { valid: false, error: 'Username must be 30 characters or less' }
  }

  if (!/^[a-zA-Z0-9_-]+$/.test(sanitized)) {
    return {
      valid: false,
      error: 'Username can only contain letters, numbers, underscores, and hyphens'
    }
  }

  // Check for reserved usernames
  const reservedUsernames = [
    'admin',
    'api',
    'root',
    'system',
    'support',
    'help',
    'about',
    'login',
    'signup',
    'www',
    'mail',
    'ftp'
  ]
  if (reservedUsernames.includes(sanitized.toLowerCase())) {
    return { valid: false, error: 'Username is reserved' }
  }

  return { valid: true }
}

/**
 * Create a safe error message that doesn't leak sensitive information
 */
export function createSafeErrorMessage(
  error: unknown,
  options?: { includeStack?: boolean } | string
): string {
  // Handle old API where second param was fallbackMessage
  const fallbackMessage = typeof options === 'string' ? options : 'An error occurred'

  if (error === null || error === undefined) {
    return fallbackMessage
  }

  if (typeof error === 'string') {
    // Simple string error - just return it if safe
    return sanitizeErrorMessage(error) || fallbackMessage
  }

  if (error instanceof Error) {
    // Map common error patterns to user-friendly messages
    const errorMappings: Array<{ pattern: RegExp; message: string }> = [
      { pattern: /database.*connection.*failed/i, message: 'Database error occurred' },
      { pattern: /user not found/i, message: 'User not found' },
      { pattern: /invalid token/i, message: 'Authentication error' },
      { pattern: /rate limit exceeded/i, message: 'Too many requests' },
      { pattern: /ENOENT.*no such file/i, message: 'File not found' },
      { pattern: /ECONNREFUSED/i, message: 'Connection refused' },
      { pattern: /Timeout.*exceeded/i, message: 'Request timeout' },
      { pattern: /Invalid input/i, message: 'Invalid input' },
      { pattern: /Validation failed/i, message: 'Validation failed' },
      { pattern: /Resource not found/i, message: 'Resource not found' },
      { pattern: /Access denied/i, message: 'Access denied' },
      { pattern: /Too many requests/i, message: 'Too many requests' }
    ]

    for (const { pattern, message } of errorMappings) {
      if (pattern.test(error.message)) {
        return message
      }
    }

    // Sanitize the error message to remove sensitive info
    return sanitizeErrorMessage(error.message) || fallbackMessage
  }

  return fallbackMessage
}

/**
 * Validate request origin for CSRF protection
 */
export function validateOrigin(
  request: Request,
  allowedOrigins: string[] = []
): { valid: boolean; error?: string } {
  const origin = request.headers.get('origin')

  if (!origin) {
    return { valid: false, error: 'Origin header required' }
  }

  // If allowed origins are provided, check against them
  if (allowedOrigins.length > 0) {
    if (allowedOrigins.includes(origin)) {
      return { valid: true }
    }
    return { valid: false, error: 'Origin not allowed' }
  }

  // Default check against host
  const host = request.headers.get('host')
  if (!host) {
    return { valid: false, error: 'Host header missing' }
  }

  try {
    const originUrl = new URL(origin)
    if (originUrl.host === host) {
      return { valid: true }
    }
    return { valid: false, error: 'Origin does not match host' }
  } catch {
    return { valid: false, error: 'Invalid origin URL' }
  }
}
