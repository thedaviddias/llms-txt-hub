import { isIP } from 'node:net'

import { getDomain } from 'tldts'

const RESTRICTED_HOSTNAMES = new Set([
  'localhost',
  'localhost.localdomain',
  'metadata',
  'metadata.google.internal'
])

const RESTRICTED_HOST_SUFFIXES = [
  '.example',
  '.home',
  '.internal',
  '.invalid',
  '.lan',
  '.local',
  '.localhost',
  '.localdomain',
  '.test'
]

const URL_ERRORS = {
  credentials_disallowed: 'Submission URLs cannot include credentials.',
  https_required: 'Submission URLs must use HTTPS.',
  invalid_url: 'Enter a valid submission URL.',
  ip_literal_disallowed: 'Submission URLs must use a public hostname.',
  port_disallowed: 'Submission URLs must use the default HTTPS port.',
  restricted_hostname: 'Submission URLs must use a public hostname.'
} as const

/** Stable code returned when a submitted URL violates the URL policy. */
export type SubmissionUrlErrorCode = keyof typeof URL_ERRORS

/** Safe URL-policy error suitable for returning to an untrusted caller. */
export interface SubmissionUrlError {
  readonly code: SubmissionUrlErrorCode
  readonly message: (typeof URL_ERRORS)[SubmissionUrlErrorCode]
}

/** Result of validating and canonicalizing a submission URL. */
export type SubmissionUrlValidationResult =
  | {
      readonly normalizedUrl: string
      readonly ok: true
      readonly url: URL
    }
  | {
      readonly error: SubmissionUrlError
      readonly ok: false
    }

const failure = (code: SubmissionUrlErrorCode): SubmissionUrlValidationResult => ({
  error: { code, message: URL_ERRORS[code] },
  ok: false
})

const normalizeIpInput = (address: string): string =>
  address.trim().toLowerCase().replace(/^\[/, '').replace(/\]$/, '')

const parseIpv4 = (address: string): number | null => {
  const octets = address.split('.')
  if (octets.length !== 4) {
    return null
  }

  let value = 0
  for (const octet of octets) {
    if (!/^\d{1,3}$/.test(octet)) {
      return null
    }
    const parsed = Number(octet)
    if (parsed > 255) {
      return null
    }
    value = value * 256 + parsed
  }
  return value
}

const ipv4InCidr = (address: number, base: number, prefix: number): boolean => {
  const blockSize = 2 ** (32 - prefix)
  return Math.floor(address / blockSize) === Math.floor(base / blockSize)
}

const NON_PUBLIC_IPV4_CIDRS: readonly [number, number][] = [
  [0x00000000, 8],
  [0x0a000000, 8],
  [0x64400000, 10],
  [0x7f000000, 8],
  [0xa9fe0000, 16],
  [0xac100000, 12],
  [0xc0000000, 24],
  [0xc0000200, 24],
  [0xc01fc400, 24],
  [0xc034c100, 24],
  [0xc0586300, 24],
  [0xc0a80000, 16],
  [0xc0af3000, 24],
  [0xc6120000, 15],
  [0xc6336400, 24],
  [0xcb007100, 24],
  [0xe0000000, 4],
  [0xf0000000, 4]
]

const parseIpv6 = (address: string): bigint | null => {
  let source = address
  if (source.includes('.')) {
    const finalColon = source.lastIndexOf(':')
    const ipv4 = parseIpv4(source.slice(finalColon + 1))
    if (finalColon < 0 || ipv4 === null) {
      return null
    }
    const high = Math.floor(ipv4 / 65_536).toString(16)
    const low = (ipv4 % 65_536).toString(16)
    source = `${source.slice(0, finalColon)}:${high}:${low}`
  }

  const compressionParts = source.split('::')
  if (compressionParts.length > 2) {
    return null
  }

  const left = compressionParts[0] ? compressionParts[0].split(':') : []
  const right = compressionParts[1] ? compressionParts[1].split(':') : []
  const missing = 8 - left.length - right.length
  if ((compressionParts.length === 1 && missing !== 0) || missing < 0) {
    return null
  }

  const groups = [...left, ...Array.from({ length: missing }, () => '0'), ...right]
  if (groups.length !== 8 || groups.some(group => !/^[\da-f]{1,4}$/i.test(group))) {
    return null
  }

  let value = 0n
  for (const group of groups) {
    value = (value << 16n) | BigInt(Number.parseInt(group, 16))
  }
  return value
}

const ipv6InCidr = (address: bigint, base: string, prefix: number): boolean => {
  const baseAddress = parseIpv6(base)
  if (baseAddress === null) {
    return false
  }
  const shift = BigInt(128 - prefix)
  return address >> shift === baseAddress >> shift
}

const NON_PUBLIC_IPV6_CIDRS: readonly [string, number][] = [
  ['::', 96],
  ['64:ff9b:1::', 48],
  ['100::', 64],
  ['2001::', 32],
  ['2001:2::', 48],
  ['2001:10::', 28],
  ['2001:20::', 28],
  ['2001:db8::', 32],
  ['2002::', 16],
  ['3fff::', 20],
  ['5f00::', 16],
  ['fc00::', 7],
  ['fe80::', 10],
  ['ff00::', 8]
]

/**
 * Classifies an IP address as publicly routable under the submission policy.
 *
 * Malformed, private, local, reserved, documentation, benchmarking, multicast,
 * carrier-grade NAT, and unspecified addresses fail closed.
 */
export const isPublicIpAddress = (address: string): boolean => {
  const normalized = normalizeIpInput(address)
  const family = isIP(normalized)

  if (family === 4) {
    const parsed = parseIpv4(normalized)
    return (
      parsed !== null &&
      !NON_PUBLIC_IPV4_CIDRS.some(([base, prefix]) => ipv4InCidr(parsed, base, prefix))
    )
  }

  if (family !== 6) {
    return false
  }

  const parsed = parseIpv6(normalized)
  if (parsed === null) {
    return false
  }

  if (parsed >> 32n === 0xffffn) {
    const mappedIpv4 = Number(parsed & 0xffff_ffffn)
    return !NON_PUBLIC_IPV4_CIDRS.some(([base, prefix]) => ipv4InCidr(mappedIpv4, base, prefix))
  }

  return !NON_PUBLIC_IPV6_CIDRS.some(([base, prefix]) => ipv6InCidr(parsed, base, prefix))
}

const isRestrictedHostname = (hostname: string): boolean => {
  if (RESTRICTED_HOSTNAMES.has(hostname)) {
    return true
  }
  return RESTRICTED_HOST_SUFFIXES.some(suffix => hostname.endsWith(suffix))
}

/**
 * Validates and normalizes a user-supplied URL for submission-resource inspection.
 *
 * The normalized URL is HTTPS-only, credential-free, fragment-free, hostname-based,
 * and constrained to the default TLS port. This function does not perform DNS.
 */
export const validateSubmissionUrl = (value: string): SubmissionUrlValidationResult => {
  let url: URL
  try {
    url = new URL(value)
  } catch {
    return failure('invalid_url')
  }

  if (url.protocol !== 'https:') {
    return failure('https_required')
  }
  if (url.username || url.password) {
    return failure('credentials_disallowed')
  }
  if (url.port) {
    return failure('port_disallowed')
  }

  const hostname = normalizeIpInput(url.hostname).replace(/\.$/, '')
  if (!hostname) {
    return failure('invalid_url')
  }
  if (isIP(hostname) !== 0) {
    return failure('ip_literal_disallowed')
  }
  if (isRestrictedHostname(hostname)) {
    return failure('restricted_hostname')
  }

  const registrableDomain = getDomain(hostname, {
    allowPrivateDomains: true,
    extractHostname: false
  })
  if (!registrableDomain) {
    return failure('restricted_hostname')
  }

  url.hostname = hostname
  url.hash = ''
  return { normalizedUrl: url.href, ok: true, url }
}

/**
 * Returns whether two valid submission URLs share the same registrable site family.
 *
 * Private suffixes are enabled so unrelated tenants such as distinct `github.io`
 * sites are not treated as one organization.
 */
export const areUrlsInSameSiteFamily = (left: string, right: string): boolean => {
  const leftResult = validateSubmissionUrl(left)
  const rightResult = validateSubmissionUrl(right)
  if (!leftResult.ok || !rightResult.ok) {
    return false
  }

  const options = { allowPrivateDomains: true, extractHostname: false }
  const leftDomain = getDomain(leftResult.url.hostname, options)
  const rightDomain = getDomain(rightResult.url.hostname, options)
  return leftDomain !== null && rightDomain !== null && leftDomain === rightDomain
}
