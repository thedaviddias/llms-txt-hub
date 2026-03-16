/// <reference types="@openpanel/web" />
import { OpenPanelAnalyticsComponent } from './providers/openpanel'

interface AnalyticsProviderProps {
  readonly openPanelClientId?: string
  readonly nonce?: string
}

/**
 * Provider component that injects analytics tracking scripts for all configured providers.
 *
 * @param props - Component properties
 * @param props.openPanelClientId - Client ID for OpenPanel Analytics
 * @param props.nonce - CSP nonce for inline scripts
 *
 * @returns Analytics script components
 *
 * @example
 * ```tsx
 * <AnalyticsProvider openPanelClientId="op_abc123" />
 * ```
 */
export function AnalyticsProvider({ openPanelClientId, nonce }: AnalyticsProviderProps) {
  return (
    <>
      {openPanelClientId && process.env.NODE_ENV === 'production' && (
        <OpenPanelAnalyticsComponent clientId={openPanelClientId} nonce={nonce} />
      )}
    </>
  )
}
