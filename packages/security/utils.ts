import type { ValidationResult } from './types'

/**
 * Batch validate multiple validation functions
 */
export function batchValidate(validations: Array<() => ValidationResult>): {
  valid: boolean
  errors: string[]
} {
  const errors: string[] = []

  for (const validate of validations) {
    const result = validate()
    if (!result.valid && result.error) {
      errors.push(result.error)
    }
  }

  return {
    valid: errors.length === 0,
    errors
  }
}
