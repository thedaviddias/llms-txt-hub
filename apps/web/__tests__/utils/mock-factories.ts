/**
 * Mock object factories for testing
 */

/**
 * Creates a mock user object for testing
 *
 * @param overrides - Optional properties to override default values
 * @returns Mock user object
 */
export const createMockUser = (overrides: Partial<any> = {}) => ({
  id: 'test-user-id',
  email: 'test@example.com',
  name: 'Test User',
  user_metadata: {
    user_name: 'testuser',
    avatar_url: 'https://example.com/avatar.jpg',
    ...overrides.user_metadata
  },
  publicMetadata: {
    isProfilePrivate: false,
    ...overrides.publicMetadata
  },
  createdAt: '2024-01-01T00:00:00Z',
  ...overrides
})

/**
 * Creates a mock project object for testing
 *
 * @param overrides - Optional properties to override default values
 * @returns Mock project object
 */
export const createMockProject = (overrides: Partial<any> = {}) => ({
  id: 'test-project-id',
  name: 'Test Project',
  description: 'A test project',
  url: 'https://example.com',
  tags: ['test', 'example'],
  category: 'developer-tools',
  verified: true,
  featured: false,
  ...overrides
})

/**
 * Creates a mock API response object for testing
 *
 * @param data - Response data
 * @param overrides - Optional properties to override default values
 * @returns Mock API response object
 */
export function createMockApiResponse<T>(data: T, overrides: Partial<any> = {}) {
  return {
    success: true,
    data,
    message: 'Success',
    ...overrides
  }
}

/**
 * Creates a mock API error object for testing
 *
 * @param message - Error message
 * @param status - HTTP status code (default: 500)
 * @returns Mock API error object
 */
export const createMockApiError = (message = 'Test error', status = 500) => ({
  success: false,
  error: message,
  status
})
