import { validatePublicHttpUrl } from '@/lib/url-safety'

describe('validatePublicHttpUrl', () => {
  it('accepts and normalizes public HTTPS URLs', () => {
    const result = validatePublicHttpUrl('https://B\u00dcCHER.DE:443/path?q=1#fragment')

    expect(result).toEqual({
      ok: true,
      url: new URL('https://xn--bcher-kva.de/path?q=1')
    })
  })

  it('rejects invalid URL format with the stable web error', () => {
    const result = validatePublicHttpUrl('not-a-url')

    expect(result).toEqual({ error: 'Invalid URL format', ok: false })
  })

  it.each(['http://example.com', 'ftp://example.com'])(
    'rejects non-HTTPS URL %s with the stable protocol error',
    candidate => {
      const result = validatePublicHttpUrl(candidate)

      expect(result).toEqual({ error: 'Invalid URL protocol', ok: false })
    }
  )

  it.each([
    'https://user:password@example.com',
    'https://example.com:444',
    'https://localhost',
    'https://service.localhost',
    'https://printer.local',
    'https://127.0.0.1',
    'https://[::1]',
    'https://8.8.8.8',
    'https://[2606:4700:4700::1111]',
    'https://2130706433',
    'https://0x7f000001',
    'https://0177.0.0.1',
    'https://127.1',
    'https://[::ffff:7f00:1]',
    'https://[::ffff:0808:0808]'
  ])('rejects restricted submission target %s with the stable safe error', candidate => {
    const result = validatePublicHttpUrl(candidate)

    expect(result).toEqual({
      error: 'URL points to a restricted network address',
      ok: false
    })
  })
})
