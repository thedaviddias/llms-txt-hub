import { canBypassClerkForPublicE2e } from './e2e-public-routes'

describe('public E2E authentication boundary', () => {
  it('allows only public routes in an explicitly enabled non-production test server', () => {
    expect(
      canBypassClerkForPublicE2e({ enabled: true, isProduction: false, isPublicRoute: true })
    ).toBe(true)
    expect(
      canBypassClerkForPublicE2e({ enabled: true, isProduction: false, isPublicRoute: false })
    ).toBe(false)
    expect(
      canBypassClerkForPublicE2e({ enabled: true, isProduction: true, isPublicRoute: true })
    ).toBe(false)
    expect(
      canBypassClerkForPublicE2e({ enabled: false, isProduction: false, isPublicRoute: true })
    ).toBe(false)
  })
})
