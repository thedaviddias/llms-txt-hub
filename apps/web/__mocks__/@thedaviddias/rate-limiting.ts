// Mock for @thedaviddias/rate-limiting to avoid Upstash Redis dependency in tests

/**
 * Mock rate limiter that bypasses rate limiting in tests
 */
export const withRateLimit = async (request: any, rateLimitType: string, handler: any) => {
  // In tests, just call the handler directly without rate limiting
  return await handler()
}

export const checkRateLimit = jest.fn(() => ({
  allowed: true,
  remaining: 10,
  resetTime: Date.now() + 60000
}))

export const RATE_LIMIT_EXCEEDED_MESSAGE = 'Too many requests'

// Mock any other exports the package might have
export default {
  withRateLimit,
  checkRateLimit,
  RATE_LIMIT_EXCEEDED_MESSAGE
}
