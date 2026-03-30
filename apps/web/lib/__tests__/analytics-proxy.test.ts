import { isAnalyticsProxyPath } from '@/lib/analytics-proxy'

describe('isAnalyticsProxyPath', () => {
  it.each(['/track', '/track/device-id', '/api/op/event', '/api/op/op1.js'])(
    'recognizes analytics proxy path %s',
    pathname => {
      expect(isAnalyticsProxyPath(pathname)).toBe(true)
    }
  )

  it.each(['/api/user/delete-account', '/api/csrf', '/tracker', '/search', '/'])(
    'rejects non-analytics path %s',
    pathname => {
      expect(isAnalyticsProxyPath(pathname)).toBe(false)
    }
  )
})
