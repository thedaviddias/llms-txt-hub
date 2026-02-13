/**
 * MSW Request Handlers
 *
 * Centralized API mock handlers using MSW v2 syntax.
 * All API endpoints should be mocked here for consistency.
 */

import { delay, HttpResponse, http } from 'msw'
import { createApiError, createApiResponse, MOCK_DATA } from './data.mock'

// Base API URL - adjust based on your environment
const _API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000'

// ============================================================================
// API HANDLERS
// ============================================================================

export const handlers = [
  // ===== User Management =====

  http.get('/api/user/profile/:userId', async ({ params }) => {
    const { userId } = params

    if (userId === 'not-found') {
      return HttpResponse.json(createApiError('User not found'), { status: 404 })
    }

    // Simulate network delay
    await delay(100)

    return HttpResponse.json(createApiResponse(MOCK_DATA.users.default))
  }),

  http.patch('/api/user/profile', async ({ request }) => {
    const updates = (await request.json()) as Record<string, any>

    const updatedUser = {
      ...MOCK_DATA.users.default,
      ...updates
    }

    return HttpResponse.json(createApiResponse(updatedUser))
  }),

  // ===== Favorites =====

  http.get('/api/user/favorites', async () => {
    await delay(50)

    return HttpResponse.json(createApiResponse(MOCK_DATA.favorites))
  }),

  http.post('/api/user/favorites', async ({ request }) => {
    const { projectId } = (await request.json()) as { projectId: string }

    if (!projectId) {
      return HttpResponse.json(createApiError('Project ID is required'), { status: 400 })
    }

    return HttpResponse.json(createApiResponse({ success: true }))
  }),

  http.delete('/api/user/favorites/:id', async ({ params }) => {
    const { id } = params

    if (!id) {
      return HttpResponse.json(createApiError('Invalid favorite ID'), { status: 400 })
    }

    return HttpResponse.json(createApiResponse({ success: true }))
  }),

  // ===== URL Validation =====

  http.post('/api/check-url', async ({ request }) => {
    const { url } = (await request.json()) as { url: string }

    if (!url) {
      return HttpResponse.json(createApiError('URL is required'), { status: 400 })
    }

    if (url === 'https://invalid-url.com') {
      return HttpResponse.json(createApiError('Invalid URL format'), { status: 400 })
    }

    if (url === 'https://duplicate-url.com') {
      return HttpResponse.json(
        createApiResponse({
          valid: true,
          exists: true,
          message: 'This URL already exists in our database'
        })
      )
    }

    return HttpResponse.json(
      createApiResponse({
        valid: true,
        exists: false
      })
    )
  }),

  // ===== Metadata Fetching =====

  http.post('/api/fetch-metadata', async ({ request }) => {
    const { url } = (await request.json()) as { url: string }

    await delay(200) // Simulate fetching time

    if (url === 'https://error-url.com') {
      return HttpResponse.json(createApiError('Failed to fetch metadata'), { status: 500 })
    }

    if (url === 'https://timeout-url.com') {
      await delay(10000) // Simulate timeout
    }

    return HttpResponse.json(
      createApiResponse({
        title: 'Example Website',
        description: 'An example website for testing',
        image: 'https://example.com/og-image.jpg',
        favicon: 'https://example.com/favicon.ico',
        url
      })
    )
  }),

  // ===== Username Validation =====

  http.post('/api/user/check-username', async ({ request }) => {
    const { username } = (await request.json()) as { username: string }

    if (!username) {
      return HttpResponse.json(createApiError('Username is required'), { status: 400 })
    }

    if (username === 'taken') {
      return HttpResponse.json(createApiError('Username already taken'), { status: 409 })
    }

    return HttpResponse.json(createApiResponse({ available: true }))
  }),

  // ===== Project Management =====

  http.get('/api/projects', async ({ request }) => {
    const url = new URL(request.url)
    const page = url.searchParams.get('page') || '1'
    const limit = url.searchParams.get('limit') || '10'
    const category = url.searchParams.get('category')
    const search = url.searchParams.get('search')

    await delay(100)

    let filteredProjects = MOCK_DATA.projects

    if (category) {
      filteredProjects = filteredProjects.filter(p => p.category === category)
    }

    if (search) {
      filteredProjects = filteredProjects.filter(p =>
        p.title.toLowerCase().includes(search.toLowerCase())
      )
    }

    const startIndex = (Number.parseInt(page, 10) - 1) * Number.parseInt(limit, 10)
    const endIndex = startIndex + Number.parseInt(limit, 10)
    const paginatedProjects = filteredProjects.slice(startIndex, endIndex)

    return HttpResponse.json(
      createApiResponse({
        projects: paginatedProjects,
        pagination: {
          page: Number.parseInt(page, 10),
          limit: Number.parseInt(limit, 10),
          total: filteredProjects.length,
          totalPages: Math.ceil(filteredProjects.length / Number.parseInt(limit, 10))
        }
      })
    )
  }),

  http.get('/api/projects/:id', async ({ params }) => {
    const { id } = params

    if (id === 'not-found') {
      return HttpResponse.json(createApiError('Project not found'), { status: 404 })
    }

    await delay(50)

    const project = MOCK_DATA.projects.find(p => p.id === id) || MOCK_DATA.projects[0]

    return HttpResponse.json(createApiResponse(project))
  }),

  http.post('/api/projects', async ({ request }) => {
    const projectData = (await request.json()) as Record<string, any>

    // Validation
    const requiredFields = ['title', 'url', 'category']
    const missingFields = requiredFields.filter(field => !projectData[field])

    if (missingFields.length > 0) {
      return HttpResponse.json(
        createApiError(`Missing required fields: ${missingFields.join(', ')}`),
        { status: 400 }
      )
    }

    const newProject = {
      id: `project-${Date.now()}`,
      ...projectData,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      views: 0,
      likes: 0
    }

    return HttpResponse.json(createApiResponse(newProject), { status: 201 })
  }),

  // ===== Settings =====

  http.get('/api/user/settings', async () => {
    await delay(50)

    return HttpResponse.json(createApiResponse(MOCK_DATA.settings))
  }),

  http.patch('/api/user/settings', async ({ request }) => {
    const updates = (await request.json()) as Record<string, any>

    const updatedSettings = {
      ...MOCK_DATA.settings,
      ...updates,
      updatedAt: new Date().toISOString()
    }

    return HttpResponse.json(createApiResponse(updatedSettings))
  }),

  // ===== Search =====

  http.get('/api/search', async ({ request }) => {
    const url = new URL(request.url)
    const query = url.searchParams.get('q')
    const type = url.searchParams.get('type') || 'all'

    if (!query) {
      return HttpResponse.json(createApiError('Search query is required'), { status: 400 })
    }

    await delay(150) // Simulate search latency

    const results = {
      projects:
        type === 'all' || type === 'projects'
          ? MOCK_DATA.projects.filter(p => p.title.toLowerCase().includes(query.toLowerCase()))
          : [],
      users:
        type === 'all' || type === 'users'
          ? [MOCK_DATA.users.default].filter(u =>
              u.name.toLowerCase().includes(query.toLowerCase())
            )
          : [],
      query,
      totalResults: 0
    }

    results.totalResults = results.projects.length + results.users.length

    return HttpResponse.json(createApiResponse(results))
  }),

  // ===== Analytics =====

  http.post('/api/analytics/track', async ({ request }) => {
    const event = (await request.json()) as { name?: string }

    if (!event?.name) {
      return HttpResponse.json(createApiError('Event name is required'), { status: 400 })
    }

    // Simulate analytics tracking (mock implementation)

    return HttpResponse.json(createApiResponse({ tracked: true }))
  }),

  // ===== Health Check =====

  http.get('/api/health', () => {
    return HttpResponse.json({
      status: 'healthy',
      timestamp: new Date().toISOString(),
      version: '1.0.0'
    })
  })
]

// ============================================================================
// HANDLER UTILITIES
// ============================================================================

/**
 * Create error scenario handlers for testing error states
 */
export const errorHandlers = {
  networkError: http.get('*', () => {
    return HttpResponse.error()
  }),

  serverError: http.all('*', () => {
    return HttpResponse.json(createApiError('Internal server error'), { status: 500 })
  }),

  unauthorized: http.all('*', () => {
    return HttpResponse.json(createApiError('Unauthorized'), { status: 401 })
  }),

  rateLimit: http.all('*', () => {
    return HttpResponse.json(createApiError('Too many requests'), {
      status: 429,
      headers: {
        'Retry-After': '60'
      }
    })
  })
}

/**
 * Create delay handlers for testing loading states
 */
export const delayHandlers = {
  slow: handlers.map(handler => {
    // Add 2 second delay to all handlers
    // @ts-expect-error - MSW v2 type compatibility issue
    return http.all('*', async () => {
      await delay(2000)
      return handler
    })
  }),

  timeout: handlers.map(handler => {
    // Add 30 second delay to simulate timeout
    // @ts-expect-error - MSW v2 type compatibility issue
    return http.all('*', async () => {
      await delay(30000)
      return handler
    })
  })
}
