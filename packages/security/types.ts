/**
 * URL validation options
 */
export interface URLValidationOptions {
  protocols?: string[]
  requireProtocol?: boolean
  requireTLD?: boolean
  allowAuth?: boolean
  maxLength?: number
}

/**
 * Validation result
 */
export interface ValidationResult {
  valid: boolean
  error?: string
  sanitized?: string
}
