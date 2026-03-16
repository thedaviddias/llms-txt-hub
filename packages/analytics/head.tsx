import { AnalyticsProvider } from './index'

export { OpenPanelIdentify } from './providers/openpanel-identify'

interface AnalyticsHeadProps {
  openPanelClientId?: string
  nonce?: string
}

/**
 * Analytics component specifically for the head section
 * This component should be placed in the <head> tag of your root layout
 *
 * @param props - Component properties
 * @param props.openPanelClientId - Client ID for OpenPanel Analytics
 * @param props.nonce - CSP nonce for inline scripts
 * @returns Analytics script components for head section
 *
 * @example
 * ```tsx
 * // In your root layout.tsx
 * <head>
 *   <AnalyticsHead openPanelClientId="op_abc123" nonce={nonce} />
 * </head>
 * ```
 */
export function AnalyticsHead({ openPanelClientId, nonce }: AnalyticsHeadProps) {
  return <AnalyticsProvider openPanelClientId={openPanelClientId} nonce={nonce} />
}
