/**
 * Tests for mock factories
 */

import { createMockUser } from './mock-factories'

describe('createMockUser', () => {
  it('should create a basic mock user with default values', () => {
    const user = createMockUser()

    expect(user.id).toBe('test-user-id')
    expect(user.email).toBe('test@example.com')
    expect(user.name).toBe('Test User')
    expect(user.user_metadata).toEqual({
      user_name: 'testuser',
      avatar_url: 'https://example.com/avatar.jpg'
    })
    expect(user.publicMetadata).toEqual({
      isProfilePrivate: false
    })
    expect(user.createdAt).toBe('2024-01-01T00:00:00Z')
  })

  it('should merge nested user_metadata overrides correctly', () => {
    const user = createMockUser({
      user_metadata: {
        user_name: 'customuser',
        custom_field: 'value'
      }
    })

    expect(user.user_metadata).toEqual({
      user_name: 'customuser', // Overridden
      avatar_url: 'https://example.com/avatar.jpg', // Preserved from defaults
      custom_field: 'value' // Added from overrides
    })
  })

  it('should merge nested publicMetadata overrides correctly', () => {
    const user = createMockUser({
      publicMetadata: {
        isProfilePrivate: true,
        custom_public: 'public_value'
      }
    })

    expect(user.publicMetadata).toEqual({
      isProfilePrivate: true, // Overridden
      custom_public: 'public_value' // Added from overrides
    })
  })

  it('should handle top-level overrides without clobbering nested objects', () => {
    const user = createMockUser({
      user_metadata: { user_name: 'preserved' },
      publicMetadata: { isProfilePrivate: true },
      email: 'custom@example.com',
      name: 'Custom Name'
    })

    // Nested objects should be preserved and merged
    expect(user.user_metadata).toEqual({
      user_name: 'preserved', // From overrides
      avatar_url: 'https://example.com/avatar.jpg' // From defaults
    })
    expect(user.publicMetadata).toEqual({
      isProfilePrivate: true // From overrides
    })

    // Top-level properties should be overridden
    expect(user.email).toBe('custom@example.com')
    expect(user.name).toBe('Custom Name')
  })

  it('should handle empty nested overrides', () => {
    const user = createMockUser({
      user_metadata: {},
      publicMetadata: {}
    })

    // Should use default values when nested overrides are empty
    expect(user.user_metadata).toEqual({
      user_name: 'testuser',
      avatar_url: 'https://example.com/avatar.jpg'
    })
    expect(user.publicMetadata).toEqual({
      isProfilePrivate: false
    })
  })

  it('should handle undefined nested overrides', () => {
    const user = createMockUser({
      user_metadata: undefined,
      publicMetadata: undefined
    })

    // Should use default values when nested overrides are undefined
    expect(user.user_metadata).toEqual({
      user_name: 'testuser',
      avatar_url: 'https://example.com/avatar.jpg'
    })
    expect(user.publicMetadata).toEqual({
      isProfilePrivate: false
    })
  })
})
