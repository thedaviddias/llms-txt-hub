// Learn more: https://github.com/testing-library/jest-dom
import '@testing-library/jest-dom'

import React from 'react'

// Add TextEncoder/TextDecoder polyfills for Node environment
if (typeof global.TextEncoder === 'undefined') {
  const { TextEncoder, TextDecoder } = require('node:util')
  global.TextEncoder = TextEncoder
  global.TextDecoder = TextDecoder
}

// Add Request/Response/Headers polyfills for Node environment
if (typeof global.Request === 'undefined') {
  // @ts-expect-error - Mock implementation for testing
  global.Request = class Request {
    url: string
    headers: Headers
    method: string
    body: string | null | undefined

    constructor(input: string | Request, init?: RequestInit) {
      if (typeof input === 'string') {
        this.url = input
      } else {
        this.url = input.url
      }
      this.headers = new Headers(init?.headers)
      this.method = init?.method || 'GET'
      this.body = typeof init?.body === 'string' ? init.body : String(init?.body || '')
    }

    async json() {
      return JSON.parse(this.body || '{}')
    }
  }
}

if (typeof global.Response === 'undefined') {
  // @ts-expect-error - Mock implementation for testing
  global.Response = class Response {
    ok: boolean
    status: number
    headers: Headers
    body: string | null | undefined

    constructor(body?: string | null, init?: ResponseInit) {
      this.body = body
      this.status = init?.status || 200
      this.ok = this.status >= 200 && this.status < 300
      this.headers = new Headers(init?.headers)
    }

    async json() {
      return typeof this.body === 'string' ? JSON.parse(this.body) : this.body
    }
  }
}

if (typeof global.Headers === 'undefined') {
  // @ts-expect-error - Mock implementation for testing
  global.Headers = class Headers {
    private headers: Map<string, string> = new Map()

    constructor(init?: HeadersInit) {
      if (init) {
        if (Array.isArray(init)) {
          for (const [key, value] of init) {
            this.set(key, value)
          }
        } else if (typeof init === 'object') {
          for (const [key, value] of Object.entries(init)) {
            this.set(key, String(value))
          }
        }
      }
    }

    get(key: string) {
      return this.headers.get(key.toLowerCase()) || null
    }

    set(key: string, value: string) {
      this.headers.set(key.toLowerCase(), value)
    }

    has(key: string) {
      return this.headers.has(key.toLowerCase())
    }

    delete(key: string) {
      this.headers.delete(key.toLowerCase())
    }
  }
}

// Import MSW server for API mocking
try {
  require('./__tests__/mocks/server.mock')
} catch {
  // MSW server not available yet
}

// Mock Next.js router
jest.mock('next/router', () => ({
  useRouter: () => ({
    push: jest.fn(),
    replace: jest.fn(),
    prefetch: jest.fn(),
    back: jest.fn(),
    pathname: '/',
    query: {},
    asPath: '/',
    events: {
      on: jest.fn(),
      off: jest.fn(),
      emit: jest.fn()
    }
  })
}))

// Mock next/navigation
jest.mock('next/navigation', () => ({
  useRouter: () => ({
    push: jest.fn(),
    replace: jest.fn(),
    back: jest.fn(),
    forward: jest.fn(),
    refresh: jest.fn(),
    prefetch: jest.fn()
  }),
  usePathname: () => '/',
  useSearchParams: () => new URLSearchParams(),
  useParams: () => ({})
}))

// Mock next-themes
jest.mock('next-themes', () => ({
  ThemeProvider: ({
    children
  }: {
    children: React.ReactNode
    attribute?: string
    defaultTheme?: string
    enableSystem?: boolean
  }) => children,
  useTheme: () => ({ theme: 'light', setTheme: jest.fn() })
}))

// Mock Sentry
jest.mock('@sentry/nextjs', () => ({
  init: jest.fn(),
  captureException: jest.fn(),
  captureMessage: jest.fn(),
  withScope: jest.fn(),
  Integrations: {
    BrowserTracing: jest.fn()
  }
}))

// Mock logging package
jest.mock('@thedaviddias/logging', () => ({
  logger: {
    error: jest.fn(),
    info: jest.fn(),
    warn: jest.fn(),
    debug: jest.fn()
  }
}))

// Mock observability package
jest.mock('@thedaviddias/observability', () => ({
  captureError: jest.fn(),
  captureMessage: jest.fn(),
  withScope: jest.fn()
}))

// Mock @thedaviddias/auth
jest.mock('@thedaviddias/auth', () => ({
  auth: jest.fn().mockResolvedValue(null),
  AuthProviderComponent: ({ children }: { children: React.ReactNode }) => children,
  useAuth: () => ({
    user: null,
    isLoading: false,
    signIn: jest.fn(),
    signOut: jest.fn()
  })
}))

// Mock @clerk/backend to avoid ESM issues
jest.mock('@clerk/backend', () => ({
  createClerkClient: jest.fn(() => ({
    users: {
      getUser: jest.fn().mockResolvedValue(null),
      getUserList: jest.fn().mockResolvedValue({ data: [] })
    }
  }))
}))

// Mock @clerk/nextjs
jest.mock('@clerk/nextjs', () => {
  const originalModule = jest.requireActual('@clerk/nextjs')
  return {
    ...originalModule,
    useAuth: jest.fn(() => ({ userId: null })),
    auth: jest.fn(() => Promise.resolve({ userId: null })),
    currentUser: jest.fn(() => Promise.resolve(null)),
    ClerkProvider: ({ children }: { children: React.ReactNode }) => children,
    SignIn: () => null,
    SignUp: () => null,
    UserButton: () => null
  }
})

// Mock next/server NextResponse
jest.mock('next/server', () => ({
  NextRequest: class NextRequest {
    url: string
    headers: Headers
    method: string
    body: string | null | undefined
    nextUrl: URL

    constructor(input: string | Request, init?: RequestInit) {
      if (typeof input === 'string') {
        this.url = input
        this.nextUrl = new URL(input)
      } else {
        this.url = input.url
        this.nextUrl = new URL(input.url)
      }
      this.headers = new Headers(init?.headers)
      this.method = init?.method || 'GET'
      this.body = typeof init?.body === 'string' ? init.body : String(init?.body || '')
    }

    async json() {
      return JSON.parse(this.body || '{}')
    }
  },
  NextResponse: {
    json: (data: unknown, init?: ResponseInit) => {
      const response = new Response(JSON.stringify(data), {
        ...init,
        headers: {
          'content-type': 'application/json',
          ...(init?.headers || {})
        }
      })
      return response
    },
    redirect: (url: string | URL, init?: ResponseInit) => {
      return new Response(null, {
        ...init,
        status: init?.status || 302,
        headers: {
          location: url.toString(),
          ...(init?.headers || {})
        }
      })
    }
  }
}))

// Mock normalize-url to avoid ESM issues
jest.mock('normalize-url', () => ({
  __esModule: true,
  default: (url: string) => {
    // Simple normalization for tests
    try {
      const parsed = new URL(url)
      let normalized = `${parsed.protocol}//${parsed.host}${parsed.pathname}`
      normalized = normalized.replace(/\/+$/, '') // Remove trailing slashes
      normalized = normalized.replace(/^https?:\/\/www\./, 'https://') // Remove www
      return normalized
    } catch {
      return url
    }
  }
}))

// Mock sonner
jest.mock('sonner', () => ({
  Toaster: () => null,
  toast: {
    success: jest.fn(),
    error: jest.fn(),
    warning: jest.fn()
  }
}))

// Mock next/link
jest.mock('next/link', () => ({
  __esModule: true,
  default: ({ children, ...props }: { children: React.ReactNode; [key: string]: unknown }) =>
    React.createElement('a', props, children)
}))

// Mock IntersectionObserver
if (typeof global.IntersectionObserver === 'undefined') {
  global.IntersectionObserver = class IntersectionObserver {
    private callback: IntersectionObserverCallback
    private options: IntersectionObserverInit | undefined

    constructor(callback: IntersectionObserverCallback, options?: IntersectionObserverInit) {
      this.callback = callback
      this.options = options
    }

    observe(target: Element) {
      // Simulate immediate intersection for testing
      setTimeout(() => {
        this.callback(
          [
            {
              target,
              isIntersecting: true,
              intersectionRatio: 1,
              boundingClientRect: target.getBoundingClientRect(),
              intersectionRect: target.getBoundingClientRect(),
              rootBounds: null,
              time: Date.now()
            }
          ],
          this
        )
      }, 0)
    }

    unobserve(_target: Element) {
      // Mock implementation
    }

    disconnect() {
      // Mock implementation
    }

    takeRecords(): IntersectionObserverEntry[] {
      // Mock implementation - return empty array
      return []
    }

    get root() {
      return this.options?.root ?? null
    }

    get rootMargin() {
      return this.options?.rootMargin ?? '0px'
    }

    get thresholds() {
      return Array.isArray(this.options?.threshold)
        ? this.options.threshold
        : [this.options?.threshold ?? 0]
    }
  }
}

// Suppress console errors during tests
const originalConsoleError = console.error
console.error = (...args) => {
  // Suppress specific errors that might occur during testing
  const suppressedErrors = [
    'Warning: ReactDOM.render is no longer supported',
    'Warning: useLayoutEffect does nothing on the server'
  ]

  if (!suppressedErrors.some(error => args[0]?.includes(error))) {
    originalConsoleError(...args)
  }
}

// Reset mocks after each test
afterEach(() => {
  jest.clearAllMocks()
})

/**
 * Mock PointerEvent for Radix UI components
 *
 * @param type - Event type
 * @param props - Event properties
 * @returns Mock PointerEvent
 */
function createMockPointerEvent(type: string, props: PointerEventInit = {}): PointerEvent {
  const event = new Event(type, props)

  // Define properties that don't already exist on Event
  const propertiesToDefine = {
    button: props.button ?? 0,
    pointerType: props.pointerType ?? 'mouse',
    pointerId: 1,
    width: 1,
    height: 1,
    pressure: 0,
    tangentialPressure: 0,
    tiltX: 0,
    tiltY: 0,
    twist: 0,
    isPrimary: true,
    getCoalescedEvents: () => [],
    getPredictedEvents: () => []
  }

  // Only define properties that don't already exist
  Object.entries(propertiesToDefine).forEach(([key, value]) => {
    if (!(key in event)) {
      Object.defineProperty(event, key, { value, writable: true, configurable: true })
    }
  })

  // @ts-expect-error - Mock has minimal PointerEvent implementation
  return event
}

// Assign the mock function to the global window object
// This is necessary for test environment where PointerEvent is not defined
// @ts-expect-error - Assigning mock to global for testing
window.PointerEvent = createMockPointerEvent

// Mock HTMLElement methods needed for Radix UI
Object.assign(window.HTMLElement.prototype, {
  scrollIntoView: jest.fn(),
  releasePointerCapture: jest.fn(),
  hasPointerCapture: jest.fn()
})
