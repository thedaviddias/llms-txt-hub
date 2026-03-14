import { readFileSync } from 'node:fs'
import { join } from 'node:path'

describe('proxy public route coverage', () => {
  it('keeps extension lifecycle pages public', () => {
    const proxyPath = join(process.cwd(), 'proxy.ts')
    const source = readFileSync(proxyPath, 'utf8')

    expect(source).toContain("'/extension(.*)'")
    expect(source).toContain("'/api/extension-feedback(.*)'")
  })

  it('exempts uninstall feedback route from CSRF validation', () => {
    const proxyPath = join(process.cwd(), 'proxy.ts')
    const source = readFileSync(proxyPath, 'utf8')

    expect(source).toContain("!req.nextUrl.pathname.startsWith('/api/extension-feedback')")
  })

  it('allows analytics proxy non-safe method requests', () => {
    const proxyPath = join(process.cwd(), 'proxy.ts')
    const source = readFileSync(proxyPath, 'utf8')

    expect(source).toContain("'/proxy/api/(.*)'")
    expect(source).toContain("pathname.startsWith('/api/op/')")
    expect(source).toContain('const isAnalyticsProxyRoute =')
    expect(source).toContain('!isAnalyticsProxyRoute')
  })
})
