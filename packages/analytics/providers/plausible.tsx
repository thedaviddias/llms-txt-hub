import PlausibleProvider from 'next-plausible'

type PlausibleAnalyticsProps = {
  domain: string
  nonce?: string
}

/**
 * Plausible Analytics component that uses proxy rewrites to avoid ad blockers
 *
 * @param props - Component properties
 * @param props.domain - The domain to track (e.g., "llmstxthub.com")
 *
 * @returns PlausibleProvider configured to use the proxy from next.config.ts
 *
 * @example
 * ```tsx
 * <PlausibleAnalyticsComponent domain="llmstxthub.com" />
 * ```
 */
export const PlausibleAnalyticsComponent = ({ domain, nonce }: PlausibleAnalyticsProps) => {
  if (!domain) {
    return null
  }

  return (
    <PlausibleProvider
      domain={domain}
      customDomain={`https://${domain}`}
      selfHosted={true}
      enabled={true}
      trackOutboundLinks={true}
      taggedEvents={true}
      scriptProps={nonce ? { nonce } : undefined}
    />
  )
}
