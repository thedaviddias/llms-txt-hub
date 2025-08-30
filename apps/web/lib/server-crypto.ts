import 'server-only'
import crypto from 'node:crypto'

/**
 * Generate a hash of sensitive data for tracking without exposing the actual value
 * Server-side only function
 */
export function hashSensitiveData(data: string): string {
  return crypto.createHash('sha256').update(data).digest('hex').slice(0, 12)
}