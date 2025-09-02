import DOMPurify from 'isomorphic-dompurify'

/**
 * Sanitize text input to prevent XSS attacks
 *
 * @param input - Text to sanitize
 * @param options - DOMPurify options
 * @returns Sanitized text or null
 */
export function sanitizeText(
  input: string | null | undefined,
  options?: {
    allowedTags?: string[]
    allowedAttributes?: string[]
    keepContent?: boolean
  }
): string | null {
  if (input === null || input === undefined) return null
  if (input === '') return ''

  const {
    allowedTags = ['strong', 'em', 'p', 'br'],
    allowedAttributes = [],
    keepContent = true
  } = options || {}

  const cleaned = DOMPurify.sanitize(input, {
    ALLOWED_TAGS: allowedTags,
    ALLOWED_ATTR: allowedAttributes,
    KEEP_CONTENT: keepContent
  })

  return cleaned.replace(/\u200B|\u200C|\u200D|\uFEFF/g, '').trim()
}

/**
 * Escape HTML entities to prevent XSS
 *
 * @param text - Text to escape
 * @returns Escaped text
 */
export function escapeHTML(text: string | number | null | undefined): string {
  if (text === null || text === undefined) return ''
  if (typeof text === 'number') return String(text)
  if (typeof text !== 'string') return ''

  let escaped = text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;')

  escaped = escaped.replace(/&lt;\/script/gi, '&lt;&#x2F;script')

  return escaped
}

/**
 * Create a safe error message that doesn't leak sensitive information
 *
 * @param error - Error object or message
 * @param fallback - Fallback message if error cannot be safely displayed
 * @returns Safe error message
 */
export function createSafeErrorMessage(error: unknown, fallback = 'An error occurred'): string {
  if (error === null || error === undefined) {
    return fallback
  }

  if (typeof error === 'string') {
    return error
      .replace(/([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/g, '[email]')
      .replace(/\b(?:\d{1,3}\.){3}\d{1,3}\b/g, '[ip]')
      .replace(/[a-f0-9]{32,}/gi, '[hash]')
      .replace(/(password|token|secret|key)[\s=:]*["']?[\w-]+["']?/gi, '[redacted]')
  }

  if (error instanceof Error) {
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
      { pattern: /Access denied/i, message: 'Access denied' }
    ]

    for (const { pattern, message } of errorMappings) {
      if (pattern.test(error.message)) {
        return message
      }
    }

    return createSafeErrorMessage(error.message, fallback)
  }

  return fallback
}
