/**
 * Centralized Mock Data
 *
 * All mock data for testing should be defined here to maintain consistency
 * and avoid duplication across test files.
 */

// ============================================================================
// TYPE DEFINITIONS
// ============================================================================

export interface MockUser {
  id: string
  email: string
  name: string
  username: string
  imageUrl?: string
  bio?: string
  work?: string
  website?: string
  publicMetadata: {
    isProfilePrivate: boolean
    [key: string]: any
  }
  createdAt: string
  updatedAt: string
}

export interface MockProject {
  id: string
  title: string
  description: string
  url: string
  category: string
  tags: string[]
  submittedBy: string
  imageUrl?: string
  likes: number
  views: number
  featured: boolean
  createdAt: string
  updatedAt: string
}

export interface MockSettings {
  isProfilePrivate: boolean
  emailNotifications: boolean
  pushNotifications: boolean
  theme: 'light' | 'dark' | 'system'
  language: string
  timezone: string
}

// ============================================================================
// MOCK DATA CONSTANTS
// ============================================================================

export const MOCK_DATA = {
  users: {
    default: {
      id: 'user-1',
      email: 'test@example.com',
      name: 'Test User',
      username: 'testuser',
      imageUrl: 'https://avatars.githubusercontent.com/u/1?v=4',
      bio: 'A passionate developer building amazing things',
      work: 'Software Engineer',
      website: 'https://example.com',
      publicMetadata: {
        isProfilePrivate: false,
        hasContributions: true
      },
      createdAt: '2024-01-01T00:00:00Z',
      updatedAt: '2024-01-01T00:00:00Z'
    } as MockUser,

    privateProfile: {
      id: 'user-2',
      email: 'private@example.com',
      name: 'Private User',
      username: 'privateuser',
      imageUrl: 'https://avatars.githubusercontent.com/u/2?v=4',
      bio: 'Privacy focused user',
      publicMetadata: {
        isProfilePrivate: true,
        hasContributions: false
      },
      createdAt: '2024-01-01T00:00:00Z',
      updatedAt: '2024-01-01T00:00:00Z'
    } as MockUser,

    newUser: {
      id: 'user-3',
      email: 'new@example.com',
      name: 'New User',
      username: 'newuser',
      publicMetadata: {
        isProfilePrivate: false,
        hasContributions: false
      },
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    } as MockUser
  },

  projects: [
    {
      id: 'project-1',
      title: 'AI Writing Assistant',
      description: 'An AI-powered tool that helps you write better content',
      url: 'https://ai-writer.example.com',
      category: 'AI Tools',
      tags: ['ai', 'writing', 'productivity'],
      submittedBy: 'testuser',
      imageUrl: 'https://picsum.photos/400/300?random=1',
      likes: 142,
      views: 1523,
      featured: true,
      createdAt: '2024-01-15T00:00:00Z',
      updatedAt: '2024-01-15T00:00:00Z'
    },
    {
      id: 'project-2',
      title: 'Task Manager Pro',
      description: 'A powerful task management application for teams',
      url: 'https://taskmanager.example.com',
      category: 'Productivity',
      tags: ['productivity', 'management', 'teams'],
      submittedBy: 'testuser',
      imageUrl: 'https://picsum.photos/400/300?random=2',
      likes: 89,
      views: 976,
      featured: false,
      createdAt: '2024-01-10T00:00:00Z',
      updatedAt: '2024-01-10T00:00:00Z'
    },
    {
      id: 'project-3',
      title: 'Code Snippets Hub',
      description: 'Share and discover useful code snippets',
      url: 'https://snippets.example.com',
      category: 'Development',
      tags: ['development', 'code', 'snippets', 'sharing'],
      submittedBy: 'privateuser',
      imageUrl: 'https://picsum.photos/400/300?random=3',
      likes: 234,
      views: 3456,
      featured: true,
      createdAt: '2024-01-05T00:00:00Z',
      updatedAt: '2024-01-05T00:00:00Z'
    },
    {
      id: 'project-4',
      title: 'Design System Kit',
      description: 'A comprehensive design system for modern web apps',
      url: 'https://designsystem.example.com',
      category: 'Design',
      tags: ['design', 'ui', 'components'],
      submittedBy: 'newuser',
      imageUrl: 'https://picsum.photos/400/300?random=4',
      likes: 178,
      views: 2134,
      featured: false,
      createdAt: '2024-01-20T00:00:00Z',
      updatedAt: '2024-01-20T00:00:00Z'
    }
  ] as MockProject[],

  favorites: ['project-1', 'project-3'],

  settings: {
    isProfilePrivate: false,
    emailNotifications: true,
    pushNotifications: false,
    theme: 'light' as const,
    language: 'en',
    timezone: 'UTC'
  } as MockSettings,

  categories: [
    'AI Tools',
    'Productivity',
    'Development',
    'Design',
    'Marketing',
    'Analytics',
    'Communication',
    'Finance'
  ],

  tags: [
    'ai',
    'productivity',
    'development',
    'design',
    'marketing',
    'analytics',
    'automation',
    'collaboration',
    'open-source',
    'saas'
  ]
}

// ============================================================================
// MOCK DATA FACTORIES
// ============================================================================

/**
 * Create a mock user with custom properties
 */
export const createMockUser = (overrides: Partial<MockUser> = {}): MockUser => ({
  ...MOCK_DATA.users.default,
  ...overrides,
  publicMetadata: {
    ...MOCK_DATA.users.default.publicMetadata,
    ...overrides.publicMetadata
  }
})

/**
 * Create a mock project with custom properties
 */
export const createMockProject = (overrides: Partial<MockProject> = {}): MockProject => ({
  id: `project-${Date.now()}`,
  title: 'Mock Project',
  description: 'A mock project for testing',
  url: 'https://mock-project.example.com',
  category: 'Development',
  tags: ['test', 'mock'],
  submittedBy: 'testuser',
  likes: 0,
  views: 0,
  featured: false,
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
  ...overrides
})

/**
 * Create a batch of mock projects
 */
export const createMockProjects = (
  count: number,
  baseOverrides: Partial<MockProject> = {}
): MockProject[] => {
  return Array.from({ length: count }, (_, index) =>
    createMockProject({
      ...baseOverrides,
      id: `project-batch-${index}`,
      title: `${baseOverrides.title || 'Project'} ${index + 1}`,
      url: `https://project-${index + 1}.example.com`
    })
  )
}

/**
 * Create mock settings with custom properties
 */
export const createMockSettings = (overrides: Partial<MockSettings> = {}): MockSettings => ({
  ...MOCK_DATA.settings,
  ...overrides
})

// ============================================================================
// API RESPONSE HELPERS
// ============================================================================

/**
 * Create a standardized API success response
 */
export const createApiResponse = <T>(data: T, meta: Record<string, any> = {}) => ({
  success: true,
  data,
  message: 'Success',
  timestamp: new Date().toISOString(),
  ...meta
})

/**
 * Create a standardized API error response
 */
export const createApiError = (message: string, code?: string, details?: Record<string, any>) => ({
  success: false,
  error: {
    message,
    code: code || 'ERROR',
    details: details || {}
  },
  timestamp: new Date().toISOString()
})

/**
 * Create a paginated API response
 */
export const createPaginatedResponse = <T>(
  items: T[],
  page: number,
  limit: number,
  total: number
) => ({
  success: true,
  data: items,
  pagination: {
    page,
    limit,
    total,
    totalPages: Math.ceil(total / limit),
    hasNext: page * limit < total,
    hasPrev: page > 1
  },
  timestamp: new Date().toISOString()
})

// ============================================================================
// TEST SCENARIO DATA
// ============================================================================

/**
 * Common test scenarios for different states
 */
export const TEST_SCENARIOS = {
  emptyState: {
    projects: [],
    users: [],
    favorites: []
  },

  loadingState: {
    isLoading: true,
    data: null
  },

  errorState: {
    isError: true,
    error: 'Something went wrong',
    data: null
  },

  authenticatedUser: {
    user: MOCK_DATA.users.default,
    isAuthenticated: true,
    token: 'mock-jwt-token'
  },

  unauthenticatedUser: {
    user: null,
    isAuthenticated: false,
    token: null
  },

  searchResults: {
    query: 'test',
    results: MOCK_DATA.projects.slice(0, 2),
    totalCount: 2
  },

  formData: {
    valid: {
      title: 'Valid Project Title',
      url: 'https://valid-project.com',
      description: 'A valid project description that is long enough',
      category: 'Development',
      tags: ['valid', 'test']
    },
    invalid: {
      title: '', // Missing title
      url: 'not-a-url', // Invalid URL
      description: 'Too short', // Too short description
      category: '', // Missing category
      tags: [] // No tags
    }
  }
}

// ============================================================================
// CLERK SPECIFIC MOCKS (if using Clerk)
// ============================================================================

export const CLERK_MOCKS = {
  user: {
    id: 'clerk_user_123',
    firstName: 'John',
    lastName: 'Doe',
    username: 'johndoe',
    emailAddresses: [
      {
        id: 'email_1',
        emailAddress: 'john@example.com',
        verification: { status: 'verified' }
      }
    ],
    imageUrl: 'https://img.clerk.com/user.jpg',
    publicMetadata: {},
    privateMetadata: {},
    unsafeMetadata: {},
    createdAt: Date.now(),
    updatedAt: Date.now()
  },

  session: {
    id: 'session_123',
    status: 'active',
    expireAt: Date.now() + 3600000, // 1 hour from now
    abandonAt: Date.now() + 86400000, // 24 hours from now
    lastActiveAt: Date.now(),
    user: null // Will be populated with user mock
  },

  organization: {
    id: 'org_123',
    name: 'Test Organization',
    slug: 'test-org',
    imageUrl: 'https://img.clerk.com/org.jpg',
    membersCount: 5,
    pendingInvitationsCount: 2,
    adminDeleteEnabled: false,
    maxAllowedMemberships: 100,
    createdAt: Date.now(),
    updatedAt: Date.now()
  }
}
