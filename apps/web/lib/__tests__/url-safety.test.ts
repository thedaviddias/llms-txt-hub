import { validatePublicHttpUrl } from '@/lib/url-safety'

describe('validatePublicHttpUrl', () => {
  it('accepts public http/https URLs', () => {
    const result = validatePublicHttpUrl('https://example.com/path?q=1')
    expect(result.ok).toBe(true)

    const httpResult = validatePublicHttpUrl('http://example.org')
    expect(httpResult.ok).toBe(true)
  })

  it('rejects invalid URL format', () => {
    const result = validatePublicHttpUrl('not-a-url')
    expect(result.ok).toBe(false)
    if (!result.ok) {
      expect(result.error).toBe('Invalid URL format')
    }
  })

  it('rejects non-http protocols', () => {
    const result = validatePublicHttpUrl('ftp://example.com')
    expect(result.ok).toBe(false)
    if (!result.ok) {
      expect(result.error).toBe('Invalid URL protocol')
    }
  })

  it('rejects localhost and loopback addresses', () => {
    const blocked = ['http://localhost:3000', 'http://127.0.0.1', 'http://[::1]']
    for (const candidate of blocked) {
      const result = validatePublicHttpUrl(candidate)
      expect(result.ok).toBe(false)
      if (!result.ok) {
        expect(result.error).toBe('URL points to a restricted network address')
      }
    }
  })

  it('rejects private IPv4 ranges', () => {
    const blocked = ['http://10.1.2.3', 'http://172.16.10.1', 'http://192.168.1.10']
    for (const candidate of blocked) {
      const result = validatePublicHttpUrl(candidate)
      expect(result.ok).toBe(false)
      if (!result.ok) {
        expect(result.error).toBe('URL points to a restricted network address')
      }
    }
  })

  it('rejects numeric and shorthand loopback host representations', () => {
    const blocked = ['http://2130706433', 'http://0x7f000001', 'http://0177.0.0.1', 'http://127.1']

    for (const candidate of blocked) {
      const result = validatePublicHttpUrl(candidate)
      expect(result.ok).toBe(false)
      if (!result.ok) {
        expect(result.error).toBe('URL points to a restricted network address')
      }
    }
  })

  it('rejects hex-form IPv4-mapped IPv6 loopback addresses', () => {
    const blocked = [
      'http://[::ffff:7f00:1]', // 127.0.0.1
      'http://[::ffff:a00:1]', // 10.0.0.1
      'http://[::ffff:c0a8:1]', // 192.168.0.1
      'http://[::ffff:ac10:fe01]' // 172.16.254.1
    ]

    for (const candidate of blocked) {
      const result = validatePublicHttpUrl(candidate)
      expect(result.ok).toBe(false)
      if (!result.ok) {
        expect(result.error).toBe('URL points to a restricted network address')
      }
    }
  })

  it('accepts hex-form IPv4-mapped IPv6 public addresses', () => {
    const allowed = [
      'http://[::ffff:0808:0808]' // 8.8.8.8
    ]

    for (const candidate of allowed) {
      const result = validatePublicHttpUrl(candidate)
      expect(result.ok).toBe(true)
    }
  })
})
