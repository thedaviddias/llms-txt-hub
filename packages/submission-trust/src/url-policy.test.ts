import { describe, expect, it } from 'vitest'

import { areUrlsInSameSiteFamily, isPublicIpAddress, validateSubmissionUrl } from './url-policy.js'

describe('validateSubmissionUrl', () => {
  it('accepts and normalizes a public HTTPS URL', () => {
    const result = validateSubmissionUrl('https://B\u00dcCHER.DE:443/docs?q=1#section')

    expect(result).toEqual({
      normalizedUrl: 'https://xn--bcher-kva.de/docs?q=1',
      ok: true,
      url: new URL('https://xn--bcher-kva.de/docs?q=1')
    })
  })

  it.each([
    ['http://example.com', 'https_required'],
    ['ftp://example.com', 'https_required'],
    ['not a URL', 'invalid_url'],
    ['https://user:password@example.com', 'credentials_disallowed'],
    ['https://127.0.0.1', 'ip_literal_disallowed'],
    ['https://[2606:4700:4700::1111]', 'ip_literal_disallowed'],
    ['https://localhost', 'restricted_hostname'],
    ['https://service.localhost', 'restricted_hostname'],
    ['https://printer.local', 'restricted_hostname'],
    ['https://example.com:444', 'port_disallowed']
  ])('rejects %s with stable code %s', (candidate, code) => {
    const result = validateSubmissionUrl(candidate)

    expect(result.ok).toBe(false)
    if (!result.ok) {
      expect(result.error.code).toBe(code)
      expect(result.error.message).not.toContain(candidate)
    }
  })
})

describe('areUrlsInSameSiteFamily', () => {
  it('accepts subdomains sharing a registrable domain', () => {
    expect(
      areUrlsInSameSiteFamily('https://www.example.co.uk', 'https://docs.example.co.uk/llms.txt')
    ).toBe(true)
  })

  it('rejects unrelated registrable domains', () => {
    expect(areUrlsInSameSiteFamily('https://example.com', 'https://example.net')).toBe(false)
  })

  it('uses private suffixes to reject unrelated multi-tenant sites', () => {
    expect(areUrlsInSameSiteFamily('https://first.github.io', 'https://second.github.io')).toBe(
      false
    )
    expect(areUrlsInSameSiteFamily('https://first.github.io', 'https://docs.first.github.io')).toBe(
      true
    )
  })
})

describe('isPublicIpAddress', () => {
  it.each([
    '127.0.0.1',
    '10.0.0.1',
    '100.64.0.1',
    '169.254.1.1',
    '192.0.2.10',
    '198.18.0.1',
    '198.51.100.10',
    '203.0.113.10',
    '224.0.0.1',
    '240.0.0.1',
    '::',
    '::1',
    'fc00::1',
    'fe80::1',
    'ff00::1',
    '2001:db8::1',
    '::ffff:10.0.0.1',
    'malformed-address'
  ])('classifies %s as non-public', address => {
    expect(isPublicIpAddress(address)).toBe(false)
  })

  it.each(['8.8.8.8', '1.1.1.1', '2606:4700:4700::1111', '::ffff:8.8.8.8'])(
    'classifies %s as public',
    address => {
      expect(isPublicIpAddress(address)).toBe(true)
    }
  )
})
