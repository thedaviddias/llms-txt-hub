import 'server-only'
import crypto from 'node:crypto'

/**
 * Produce a deterministic, non-reversible identifier for sensitive input by hashing and truncating it.
 *
 * This server-side utility computes the SHA-256 digest of `data`, returns the hex representation
 * truncated to the first 12 characters. Use when you need a stable, non-reversible identifier for
 * tracking or correlation without exposing the original value.
 *
 * @param data - Sensitive input to be hashed.
 * @returns A 12-character hex string (prefix of the SHA-256 digest) representing `data`.
 */
export function hashSensitiveData(data: string): string {
  return crypto.createHash('sha256').update(data).digest('hex').slice(0, 12)
}
