import { canBypassClerkForPublicE2e, canUseEmptyMembersForPublicE2e } from './e2e-public-routes'

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

  it('permits empty public member data only in non-production E2E mode', () => {
    expect(canUseEmptyMembersForPublicE2e({ enabled: true, isProduction: false })).toBe(true)
    expect(canUseEmptyMembersForPublicE2e({ enabled: true, isProduction: true })).toBe(false)
    expect(canUseEmptyMembersForPublicE2e({ enabled: false, isProduction: false })).toBe(false)
  })
})
