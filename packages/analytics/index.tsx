import { PlausibleAnalyticsComponent } from './providers/plausible'

interface AnalyticsProviderProps {
  readonly plausibleDomain: string
}

/**
 * Provider component that injects analytics tracking script
 *
 * @param props - Component properties
 * @param props.plausibleDomain - Domain for Plausible Analytics tracking (e.g., "example.com")
 *
 * @throws Will throw an error in development if plausibleDomain is empty
 * @returns Analytics script component
 *
 * @example
 * ```tsx
 * <AnalyticsProvider plausibleDomain="example.com" />
 * ```
 */
export function AnalyticsProvider({ plausibleDomain }: AnalyticsProviderProps) {
  // Validate domain in development
  if (process.env.NODE_ENV === 'development' && !plausibleDomain.trim()) {
    throw new Error('plausibleDomain is required for AnalyticsProvider')
  }

  // Skip analytics if domain is empty in production
  if (!plausibleDomain.trim()) {
    return null
  }

  return <PlausibleAnalyticsComponent domain={plausibleDomain} />
}
