import PlausibleProvider from 'next-plausible'
import type { ReactNode } from 'react'

type PlausibleAnalyticsProps = {
  domain: string
  children: ReactNode
}

export const PlausibleAnalyticsComponent = ({ domain, children }: PlausibleAnalyticsProps) => {
  if (!domain) {
    return children
  }

  return (
    <PlausibleProvider domain={domain} enabled={true} trackOutboundLinks={true} taggedEvents={true}>
      {children}
    </PlausibleProvider>
  )
}
