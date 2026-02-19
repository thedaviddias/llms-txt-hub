import { isIP } from 'node:net'

const BLOCKED_HOSTNAMES = new Set([
  'localhost',
  'localhost.localdomain',
  '0.0.0.0',
  '127.0.0.1',
  '::1',
  '::',
  '169.254.169.254',
  'metadata.google.internal',
  'metadata'
])

const BLOCKED_HOST_SUFFIXES = ['.localhost', '.local']

const URL_ERROR = {
  FORMAT: 'Invalid URL format',
  PROTOCOL: 'Invalid URL protocol',
  RESTRICTED_HOST: 'URL points to a restricted network address'
} as const

/**
 * Parse strict dotted-quad IPv4 literals.
 */
function parseIPv4(ip: string): number[] | null {
  const octets = ip.split('.')
  if (octets.length !== 4) return null

  const parsed = octets.map(o => Number.parseInt(o, 10))
  if (parsed.some(n => Number.isNaN(n) || n < 0 || n > 255)) return null
  return parsed
}

/**
 * Identify private, loopback, link-local, and other non-public IPv4 ranges.
 */
function isPrivateIPv4(ip: string): boolean {
  const octets = parseIPv4(ip)
  if (!octets) return false

  const [a, b] = octets
  return (
    a === 0 ||
    a === 10 ||
    a === 127 ||
    (a === 100 && b >= 64 && b <= 127) ||
    (a === 169 && b === 254) ||
    (a === 172 && b >= 16 && b <= 31) ||
    (a === 192 && b === 168) ||
    (a === 198 && (b === 18 || b === 19)) ||
    a >= 224
  )
}

/**
 * Identify private/local IPv6 ranges and IPv4-mapped private addresses.
 */
function isPrivateIPv6(ip: string): boolean {
  const value = ip.toLowerCase()

  if (value === '::1' || value === '::') return true
  if (value.startsWith('fc') || value.startsWith('fd')) return true
  if (/^fe[89ab]/.test(value)) return true

  // Handle IPv4-mapped addresses (e.g. ::ffff:127.0.0.1)
  if (value.startsWith('::ffff:')) {
    const mapped = value.slice('::ffff:'.length)
    return isPrivateIPv4(mapped)
  }

  return false
}

/**
 * Check whether a host resolves to a blocked local/private target.
 */
function isRestrictedHost(hostname: string): boolean {
  const normalized = hostname
    .trim()
    .replace(/^\[/, '')
    .replace(/\]$/, '')
    .replace(/\.$/, '')
    .toLowerCase()
  if (!normalized) return true

  if (BLOCKED_HOSTNAMES.has(normalized)) return true
  if (BLOCKED_HOST_SUFFIXES.some(suffix => normalized.endsWith(suffix))) return true

  const ipVersion = isIP(normalized)
  if (ipVersion === 4) return isPrivateIPv4(normalized)
  if (ipVersion === 6) return isPrivateIPv6(normalized)

  return false
}

export type PublicUrlValidationResult =
  | { ok: true; url: URL }
  | { ok: false; error: (typeof URL_ERROR)[keyof typeof URL_ERROR] }

/**
 * Validates user-provided URLs for server-side fetch use cases.
 * Blocks non-http(s) protocols and common private/local network targets.
 */
export function validatePublicHttpUrl(value: string): PublicUrlValidationResult {
  let parsed: URL
  try {
    parsed = new URL(value)
  } catch {
    return { ok: false, error: URL_ERROR.FORMAT }
  }

  if (!['http:', 'https:'].includes(parsed.protocol)) {
    return { ok: false, error: URL_ERROR.PROTOCOL }
  }

  if (isRestrictedHost(parsed.hostname)) {
    return { ok: false, error: URL_ERROR.RESTRICTED_HOST }
  }

  return { ok: true, url: parsed }
}

export const URL_VALIDATION_ERRORS = URL_ERROR
