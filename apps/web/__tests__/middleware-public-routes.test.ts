import { readFileSync } from 'node:fs'
import { join } from 'node:path'

describe('middleware public route coverage', () => {
  it('keeps extension lifecycle pages public', () => {
    const middlewarePath = join(process.cwd(), 'middleware.ts')
    const source = readFileSync(middlewarePath, 'utf8')

    expect(source).toContain("'/extension(.*)'")
    expect(source).toContain("'/api/extension-feedback(.*)'")
  })

  it('exempts uninstall feedback route from CSRF validation', () => {
    const middlewarePath = join(process.cwd(), 'middleware.ts')
    const source = readFileSync(middlewarePath, 'utf8')

    expect(source).toContain("!req.nextUrl.pathname.startsWith('/api/extension-feedback')")
  })

  it('allows plausible analytics proxy non-safe method requests', () => {
    const middlewarePath = join(process.cwd(), 'middleware.ts')
    const source = readFileSync(middlewarePath, 'utf8')

    expect(source).toContain("'/proxy/api/(.*)'")
    expect(source).toContain("const isPlausibleProxyApiRoute = pathname.startsWith('/proxy/api/')")
    expect(source).toContain('!isPlausibleProxyApiRoute')
  })
})
