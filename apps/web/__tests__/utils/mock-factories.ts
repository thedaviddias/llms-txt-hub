/**
 * Mock object factories for testing
 */

/**
 * Creates a mock user object for testing
 *
 * @param overrides - Optional properties to override default values
 * @returns Mock user object
 */
export const createMockUser = (overrides: Partial<any> = {}) => {
  // Extract nested overrides to prevent clobbering
  const {
    user_metadata: userMetadataOverrides,
    publicMetadata: publicMetadataOverrides,
    ...topLevelOverrides
  } = overrides

  // Merge nested objects with defaults
  const mergedUserMetadata = {
    user_name: 'testuser',
    avatar_url: 'https://example.com/avatar.jpg',
    ...userMetadataOverrides
  }

  const mergedPublicMetadata = {
    isProfilePrivate: false,
    ...publicMetadataOverrides
  }

  // Return mock user with properly merged nested objects
  // Note: We explicitly set the nested objects to prevent top-level overrides from clobbering them
  return {
    id: 'test-user-id',
    email: 'test@example.com',
    name: 'Test User',
    user_metadata: mergedUserMetadata,
    publicMetadata: mergedPublicMetadata,
    createdAt: '2024-01-01T00:00:00Z',
    ...topLevelOverrides
  }
}

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
