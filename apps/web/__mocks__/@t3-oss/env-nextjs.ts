// Mock for @t3-oss/env-nextjs to avoid ESM issues in Jest

/**
 * Creates a mock environment configuration for testing
 */
export function createEnv(config: any) {
  // Return a mock object with the expected environment variables
  return {
    KV_REST_API_URL: process.env.KV_REST_API_URL || '',
    KV_REST_API_TOKEN: process.env.KV_REST_API_TOKEN || ''
  }
}
