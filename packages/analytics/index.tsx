import { env } from '@thedaviddias/config-environment'
import type { ReactNode } from 'react'
import { PlausibleAnalyticsComponent } from './providers/plausible'

interface AnalyticsProviderProps {
  readonly children: ReactNode
  readonly plausibleDomain: string
}

/**
 * Provider component that wraps the application with analytics tracking
 *
 * @param props - Component properties
 * @param props.children - Child elements to be wrapped
 * @param props.plausibleDomain - Domain for Plausible Analytics tracking (e.g., "example.com")
 *
 * @throws Will throw an error in development if plausibleDomain is empty
 * @returns React component wrapped with analytics when enabled
 *
 * @example
 * ```tsx
 * <AnalyticsProvider plausibleDomain="example.com">
 *   <App />
 * </AnalyticsProvider>
 * ```
 */
export function AnalyticsProvider({ children, plausibleDomain }: AnalyticsProviderProps) {
  // Validate domain in development
  if (process.env.NODE_ENV === 'development' && !plausibleDomain.trim()) {
    throw new Error('plausibleDomain is required for AnalyticsProvider')
  }

  // Skip analytics wrapper if domain is empty in production
  if (!plausibleDomain.trim()) {
    return children
  }

  return (
    <PlausibleAnalyticsComponent domain={plausibleDomain}>{children}</PlausibleAnalyticsComponent>
  )
}
