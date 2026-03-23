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

    expect(source).toContain("'/api/op/(.*)'")
    expect(source).toContain("'/track(.*)'")
    expect(source).toContain('const isAnalyticsProxyRoute = isAnalyticsProxyPath(pathname)')
    expect(source).toContain('!isAnalyticsProxyRoute')
  })

  it('skips CSRF validation for analytics proxy requests', () => {
    const proxyPath = join(process.cwd(), 'proxy.ts')
    const source = readFileSync(proxyPath, 'utf8')

    expect(source).toContain('!isAnalyticsProxyRoute &&')
    expect(source).toContain('const isAnalyticsProxyRoute = isAnalyticsProxyPath(pathname)')
  })
})
