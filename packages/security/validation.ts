import validator from 'validator'
import { MALICIOUS_PROTOCOLS, RESERVED_USERNAMES } from './constants'
import { sanitizeText } from './sanitization'
import type { URLValidationOptions, ValidationResult } from './types'

/**
 * Check if URL contains malicious protocols
 */
export function hasMaliciousProtocol(url: string): boolean {
  const trimmed = url.trim()
  // Match malicious protocols only at the start (case-insensitive)
  return /^(javascript|data|vbscript|file):/i.test(trimmed)
}

/**
 * Validate and sanitize URL
 */
export function validateURL(
  url: string | null | undefined,
  options: URLValidationOptions = {}
): ValidationResult {
  if (!url) {
    return { valid: false, error: 'URL is required' }
  }

  const trimmed = url.trim()
  const {
    protocols = ['http', 'https'],
    requireProtocol = true,
    requireTLD = false,
    allowAuth = false,
    maxLength = 2048
  } = options

  if (trimmed.length > maxLength) {
    return { valid: false, error: `URL must be ${maxLength} characters or less` }
  }

  if (hasMaliciousProtocol(trimmed)) {
    return { valid: false, error: 'Invalid URL protocol' }
  }

  if (
    !validator.isURL(trimmed, {
      protocols,
      require_protocol: requireProtocol,
      require_valid_protocol: true,
      allow_query_components: true,
      allow_fragments: true,
      allow_underscores: true,
      disallow_auth: !allowAuth,
      require_tld: requireTLD
    })
  ) {
    return { valid: false, error: 'Invalid URL format' }
  }

  return { valid: true, sanitized: trimmed }
}

/**
 * Validate username format
 */
export function validateUsername(
  username: string | null | undefined,
  options?: {
    minLength?: number
    maxLength?: number
    allowedChars?: RegExp
    reservedUsernames?: readonly string[]
  }
): ValidationResult {
  if (!username) {
    return { valid: false, error: 'Username is required' }
  }

  const {
    minLength = 3,
    maxLength = 30,
    allowedChars = /^[a-zA-Z0-9_-]+$/,
    reservedUsernames = RESERVED_USERNAMES
  } = options || {}

  const sanitized = sanitizeText(username)
  if (!sanitized) {
    return { valid: false, error: 'Username cannot be empty' }
  }

  if (sanitized.length < minLength) {
    return { valid: false, error: `Username must be at least ${minLength} characters` }
  }

  if (sanitized.length > maxLength) {
    return { valid: false, error: `Username must be ${maxLength} characters or less` }
  }

  if (!allowedChars.test(sanitized)) {
    return {
      valid: false,
      error: 'Username can only contain letters, numbers, underscores, and hyphens'
    }
  }

  const lowerUsername = sanitized.toLowerCase()
  if (reservedUsernames.some(reserved => reserved === lowerUsername)) {
    return { valid: false, error: 'Username is reserved' }
  }

  return { valid: true, sanitized }
}

/**
 * Validate email address
 */
export function validateEmail(
  email: string | null | undefined,
  options?: {
    allowDisplayName?: boolean
    requireDisplayName?: boolean
    allowUtf8LocalPart?: boolean
    requireTld?: boolean
    ignoreMaxLength?: boolean
    domainWhitelist?: string[]
    domainBlacklist?: string[]
  }
): ValidationResult {
  if (!email) {
    return { valid: false, error: 'Email is required' }
  }

  const trimmed = email.trim().toLowerCase()

  const {
    allowDisplayName = false,
    requireDisplayName = false,
    allowUtf8LocalPart = false,
    requireTld = true,
    ignoreMaxLength = false,
    domainWhitelist = [],
    domainBlacklist = []
  } = options || {}

  const emailOptions: any = {
    allow_display_name: allowDisplayName,
    require_display_name: requireDisplayName,
    allow_utf8_local_part: allowUtf8LocalPart,
    require_tld: requireTld,
    ignore_max_length: ignoreMaxLength,
    domain_specific_validation: true
  }

  // Only add host_whitelist if non-empty
  if (domainWhitelist.length > 0) {
    emailOptions.host_whitelist = domainWhitelist
  }

  // Only add host_blacklist if non-empty
  if (domainBlacklist.length > 0) {
    emailOptions.host_blacklist = domainBlacklist
  }

  if (!validator.isEmail(trimmed, emailOptions)) {
    return { valid: false, error: 'Invalid email format' }
  }

  return { valid: true, sanitized: trimmed }
}

/**
 * Validate phone number
 */
export function validatePhoneNumber(
  phone: string | null | undefined,
  locale: validator.MobilePhoneLocale = 'en-US'
): ValidationResult {
  if (!phone) {
    return { valid: false, error: 'Phone number is required' }
  }

  const cleaned = phone.replace(/\D/g, '')

  if (!validator.isMobilePhone(cleaned, locale, { strictMode: false })) {
    return { valid: false, error: 'Invalid phone number format' }
  }

  return { valid: true, sanitized: cleaned }
}

/**
 * Validate LinkedIn URL
 */
export function validateLinkedInURL(url: string | null | undefined): ValidationResult {
  if (!url) {
    return { valid: false, error: 'LinkedIn URL is required' }
  }

  const trimmed = url.trim()

  if (trimmed.length > 100) {
    return { valid: false, error: 'LinkedIn URL must be 100 characters or less' }
  }

  if (!trimmed.includes('linkedin.com/in/')) {
    return {
      valid: false,
      error: 'Please enter a valid LinkedIn profile URL (e.g., linkedin.com/in/yourname)'
    }
  }

  const urlToCheck = trimmed.startsWith('http') ? trimmed : `https://${trimmed}`

  try {
    new URL(urlToCheck)
    return { valid: true, sanitized: urlToCheck }
  } catch {
    return { valid: false, error: 'Please enter a valid LinkedIn URL' }
  }
}

/**
 * Validate origin for CSRF protection
 */
export function validateOrigin(request: Request, allowedOrigins: string[] = []): ValidationResult {
  const origin = request.headers.get('origin')

  if (!origin) {
    return { valid: false, error: 'Origin header required' }
  }

  if (allowedOrigins.length > 0) {
    if (allowedOrigins.includes(origin)) {
      return { valid: true }
    }
    return { valid: false, error: 'Origin not allowed' }
  }

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

/**
 * Batch validate multiple inputs
 */
