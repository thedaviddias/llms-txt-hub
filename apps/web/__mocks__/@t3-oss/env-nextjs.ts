// Mock for @t3-oss/env-nextjs to avoid ESM issues in Jest

/**
 * Creates a mock environment configuration for testing
 */
export function createEnv(config: any) {
  // Return a mock object with the expected environment variables
  return {
    STORAGE_REDIS_URL: process.env.STORAGE_REDIS_URL || '',
    STORAGE_KV_REST_API_TOKEN: process.env.STORAGE_KV_REST_API_TOKEN || ''
  }
}
