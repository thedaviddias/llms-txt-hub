import { OpenPanelAnalyticsComponent } from './providers/openpanel'
import { PlausibleAnalyticsComponent } from './providers/plausible'

interface AnalyticsProviderProps {
  readonly plausibleDomain: string
  readonly openPanelClientId?: string
  readonly nonce?: string
}

/**
 * Provider component that injects analytics tracking scripts for all configured providers.
 *
 * @param props - Component properties
 * @param props.plausibleDomain - Domain for Plausible Analytics tracking (e.g., "example.com")
 * @param props.openPanelClientId - Client ID for OpenPanel Analytics
 *
 * @throws Will throw an error in development if plausibleDomain is empty
 * @returns Analytics script components
 *
 * @example
 * ```tsx
 * <AnalyticsProvider plausibleDomain="example.com" openPanelClientId="op_abc123" />
 * ```
 */
export function AnalyticsProvider({
  plausibleDomain,
  openPanelClientId,
  nonce
}: AnalyticsProviderProps) {
  if (process.env.NODE_ENV === 'development' && !plausibleDomain.trim()) {
    throw new Error('plausibleDomain is required for AnalyticsProvider')
  }

  if (!plausibleDomain.trim()) {
    return null
  }

  return (
    <>
      <PlausibleAnalyticsComponent domain={plausibleDomain} nonce={nonce} />
      {openPanelClientId && process.env.NODE_ENV === 'production' && (
        <OpenPanelAnalyticsComponent clientId={openPanelClientId} nonce={nonce} />
      )}
    </>
  )
}
