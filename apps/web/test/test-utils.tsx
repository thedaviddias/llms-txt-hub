import { render as rtlRender } from '@testing-library/react'
import React from 'react'
import { Toaster } from 'sonner'

// Mock implementations
const MockThemeProvider = ({ children, attribute, defaultTheme, enableSystem }: {
  children: React.ReactNode
  attribute?: string
  defaultTheme?: string
  enableSystem?: boolean
}) => {
  return <>{children}</>
}

const MockAuthProvider = ({ children }: { children: React.ReactNode }) => {
  return <>{children}</>
}

// Mock auth context
export const mockAuthContext = {
  user: null,
  isLoading: false,
  signIn: jest.fn(),
  signOut: jest.fn()
}

// Mock theme context
export const mockThemeContext = {
  theme: 'light',
  setTheme: jest.fn()
}

function render(ui: React.ReactElement, {
  authContext = mockAuthContext,
  themeContext = mockThemeContext,
  ...options
} = {}) {
  function Wrapper({ children }: { children: React.ReactNode }) {
    return (
      <MockThemeProvider attribute="class" defaultTheme="system" enableSystem>
        <MockAuthProvider>
          {children}
          <Toaster />
        </MockAuthProvider>
      </MockThemeProvider>
    )
  }

  return rtlRender(ui, { wrapper: Wrapper, ...options })
}

// Test utilities
export const createMockRouter = (props: any) => ({
  push: jest.fn(),
  replace: jest.fn(),
  back: jest.fn(),
  forward: jest.fn(),
  refresh: jest.fn(),
  prefetch: jest.fn(),
  ...props
})

// Re-export everything
export * from '@testing-library/react'
export { render }
