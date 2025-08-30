/**
 * Shared test setup for security-utils tests
 *
 * Mock implementations and common utilities for testing security functions
 */

// Mock Request for Node environment (only if not already available)
if (typeof global.Request === 'undefined') {
  global.Request = jest.fn().mockImplementation((url, init) => {
    const headers = new Map()
    if (init?.headers) {
      Object.entries(init.headers).forEach(([key, value]) => {
        headers.set(key.toLowerCase(), value as string)
      })
    }
    return {
      url,
      headers: {
        get: (key: string) => headers.get(key.toLowerCase()) || null,
        set: (key: string, value: string) => headers.set(key.toLowerCase(), value)
      }
    }
  }) as any
}

// Mock Headers
global.Headers = jest.fn().mockImplementation(init => {
  const headers = new Map()
  if (init) {
    Object.entries(init).forEach(([key, value]) => {
      headers.set(key.toLowerCase(), value as string)
    })
  }
  return {
    get: (key: string) => headers.get(key.toLowerCase()) || null,
    set: (key: string, value: string) => headers.set(key.toLowerCase(), value)
  }
}) as any

/**
 * Input parameters for creating a mock request
 */
interface CreateMockRequestInput {
  /** Request URL */
  url: string
  /** Request headers (optional, defaults to empty object) */
  headers?: Record<string, string>
}

/**
 * Helper to create a mock request for testing
 *
 * @param input - Input parameters for creating the mock request
 * @param input.url - Request URL
 * @param input.headers - Request headers (optional)
 * @returns Mock request object
 */
export function createMockRequest({ url, headers = {} }: CreateMockRequestInput) {
  return new Request(url, { headers })
}

/**
 * Test data for XSS attack vectors
 */
export const XSS_ATTACK_VECTORS = [
  '<script>alert("xss")</script>',
  '<img src="x" onerror="alert(1)">',
  '<svg onload="alert(1)">',
  'javascript:alert(1)',
  'data:text/html,<script>alert(1)</script>',
  '<iframe src="javascript:alert(1)"></iframe>',
  '<object data="javascript:alert(1)">',
  '<embed src="javascript:alert(1)">',
  '<link rel="stylesheet" href="javascript:alert(1)">',
  '<meta http-equiv="refresh" content="0;url=javascript:alert(1)">'
]

/**
 * Test data for SQL injection vectors
 */
export const SQL_INJECTION_VECTORS = [
  "'; DROP TABLE users; --",
  "' OR 1=1 --",
  "' UNION SELECT * FROM users --",
  "'; INSERT INTO users VALUES ('hacker', 'pass'); --",
  "admin'--",
  "admin'#",
  "admin'/*",
  "' or 1=1#",
  "' or 1=1--",
  "' or 1=1/*"
]

/**
 * Test data for valid usernames
 */
export const VALID_USERNAMES = [
  'user123',
  'john_doe',
  'jane-smith',
  'User_123-456',
  'abc',
  'test-user',
  'user_name',
  'username123'
]

/**
 * Test data for invalid usernames
 */
export const INVALID_USERNAMES = [
  'user@name',
  'user.name',
  'user name',
  'user#123',
  'user$',
  'user&co',
  'user%test',
  'user!',
  'user?'
]

/**
 * Test data for valid URLs
 */
export const VALID_URLS = [
  'https://example.com',
  'https://example.com/path',
  'https://example.com/path?query=value',
  'https://example.com/path#fragment',
  'https://subdomain.example.com',
  'https://example.com:8080',
  'http://localhost:3000',
  'http://127.0.0.1:8080',
  'https://example.com/path/to/resource.json'
]

/**
 * Test data for dangerous URLs
 */
export const DANGEROUS_URLS = [
  'javascript:alert(1)',
  'data:text/html,<script>alert(1)</script>',
  'vbscript:msgbox',
  'file:///etc/passwd',
  'JavaScript:alert(1)',
  'DATA:text/html,<script>alert(1)</script>',
  'VBSCRIPT:msgbox',
  'FILE:///etc/passwd'
]

/**
 * Test data for invalid URL formats
 */
export const INVALID_URL_FORMATS = [
  'not-a-url',
  'example.com', // No protocol
  'ftp://example.com', // Invalid protocol
  '//example.com' // Protocol-relative
]
