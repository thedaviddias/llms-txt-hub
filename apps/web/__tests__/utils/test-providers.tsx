/**
 * Test provider components and utilities
 */

import { FavoritesProvider } from '@/contexts/favorites-context'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import type { RenderOptions } from '@testing-library/react'
import { ThemeProvider } from 'next-themes'
import type { ReactNode } from 'react'

export interface CustomRenderOptions extends Omit<RenderOptions, 'wrapper'> {
  user?: any
  isAuthenticated?: boolean
  theme?: 'light' | 'dark'
  queryClient?: QueryClient
  wrapperProps?: Record<string, any>
}

/**
 * Creates a test query client with default configuration
 *
 * @returns Configured QueryClient for testing
 */
export function createTestQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
        gcTime: 0
      },
      mutations: {
        retry: false
      }
    }
  })
}

/**
 * Wrapper component that provides all necessary contexts for testing
 *
 * @param props - Component props
 * @returns React component with all providers
 */
export function TestProviders({
  children,
  queryClient,
  theme = 'light'
}: {
  children: ReactNode
  queryClient?: QueryClient
  theme?: 'light' | 'dark'
  user?: any
  isAuthenticated?: boolean
}) {
  const testQueryClient = queryClient || createTestQueryClient()

  return (
    <QueryClientProvider client={testQueryClient}>
      <ThemeProvider
        attribute="class"
        defaultTheme={theme}
        enableSystem={false}
        disableTransitionOnChange
      >
        <FavoritesProvider>{children}</FavoritesProvider>
      </ThemeProvider>
    </QueryClientProvider>
  )
}
