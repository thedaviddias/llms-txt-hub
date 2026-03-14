import { AnalyticsProvider } from './index'

export { OpenPanelIdentify } from './providers/openpanel-identify'

interface AnalyticsHeadProps {
  domain: string
  openPanelClientId?: string
  nonce?: string
}

/**
 * Analytics component specifically for the head section
 * This component should be placed in the <head> tag of your root layout
 *
 * @param props - Component properties
 * @param props.domain - Domain for Plausible Analytics tracking (e.g., "example.com")
 * @param props.openPanelClientId - Client ID for OpenPanel Analytics
 * @param props.nonce - CSP nonce for inline scripts
 * @returns Analytics script components for head section
 *
 * @example
 * ```tsx
 * // In your root layout.tsx
 * <head>
 *   <AnalyticsHead domain="example.com" openPanelClientId="op_abc123" nonce={nonce} />
 * </head>
 * ```
 */
export function AnalyticsHead({ domain, openPanelClientId, nonce }: AnalyticsHeadProps) {
  return (
    <AnalyticsProvider
      plausibleDomain={domain}
      openPanelClientId={openPanelClientId}
      nonce={nonce}
    />
  )
}
