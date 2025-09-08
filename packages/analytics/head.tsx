import { AnalyticsProvider } from './index'

interface AnalyticsHeadProps {
  domain: string
}

/**
 * Analytics component specifically for the head section
 * This component should be placed in the <head> tag of your root layout
 *
 * @param props - Component properties
 * @param props.domain - Domain for Plausible Analytics tracking (e.g., "example.com")
 * @returns Analytics script component for head section
 *
 * @example
 * ```tsx
 * // In your root layout.tsx
 * <head>
 *   <AnalyticsHead domain="example.com" />
 * </head>
 * ```
 */
export function AnalyticsHead({ domain }: AnalyticsHeadProps) {
  return <AnalyticsProvider plausibleDomain={domain} />
}
