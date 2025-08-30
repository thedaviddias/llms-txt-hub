/**
 * MSW Server Setup
 *
 * This file configures the Mock Service Worker server for testing.
 * It provides a centralized place to manage all API mocks.
 */

import { setupServer } from 'msw/node'
import { handlers } from './handlers.mock'

// Create and configure the MSW server
export const server = setupServer(...handlers)

// Enable request interception
beforeAll(() => {
  server.listen({
    onUnhandledRequest: 'warn' // Warn about unhandled requests during tests
  })
})

// Reset handlers after each test to ensure test isolation
afterEach(() => {
  server.resetHandlers()
})

// Clean up after all tests are done
afterAll(() => {
  server.close()
})

// Export server for custom handler additions in specific tests

/**
 * Helper to override handlers for specific test scenarios
 */
export const useApiMock = (handler: any) => {
  server.use(handler)
}
