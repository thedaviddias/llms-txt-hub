import { AnalyticsProvider } from './index'

interface AnalyticsHeadProps {
  domain: string
  nonce?: string
}

/**
 * Analytics component specifically for the head section
 * This component should be placed in the <head> tag of your root layout
 *
 * @param props - Component properties
 * @param props.domain - Domain for Plausible Analytics tracking (e.g., "example.com")
 * @param props.nonce - CSP nonce for inline scripts
 * @returns Analytics script component for head section
 *
 * @example
 * ```tsx
 * // In your root layout.tsx
 * <head>
 *   <AnalyticsHead domain="example.com" nonce={nonce} />
 * </head>
 * ```
 */
export function AnalyticsHead({ domain, nonce }: AnalyticsHeadProps) {
  return <AnalyticsProvider plausibleDomain={domain} nonce={nonce} />
}
