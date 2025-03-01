// Learn more: https://github.com/testing-library/jest-dom
import '@testing-library/jest-dom'
import React from 'react'

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
    children,
    attribute,
    defaultTheme,
    enableSystem
  }: {
    children: React.ReactNode
    attribute: string
    defaultTheme: string
    enableSystem: boolean
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
  AuthProviderComponent: ({ children }: { children: React.ReactNode }) => children,
  useAuth: () => ({
    user: null,
    isLoading: false,
    signIn: jest.fn(),
    signOut: jest.fn()
  })
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
  default: ({ children, ...props }: any) => React.createElement('a', props, children)
}))

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

// Mock PointerEvent for Radix UI components
function createMockPointerEvent(type: string, props: PointerEventInit = {}): PointerEvent {
  const event = new Event(type, props) as PointerEvent
  Object.assign(event, {
    button: props.button ?? 0,
    ctrlKey: props.ctrlKey ?? false,
    pointerType: props.pointerType ?? 'mouse'
  })
  return event
}

// Assign the mock function to the global window object
window.PointerEvent = createMockPointerEvent as any

// Mock HTMLElement methods needed for Radix UI
Object.assign(window.HTMLElement.prototype, {
  scrollIntoView: jest.fn(),
  releasePointerCapture: jest.fn(),
  hasPointerCapture: jest.fn()
})
