import PlausibleProvider from 'next-plausible'

type PlausibleAnalyticsProps = {
  domain: string
}

export const PlausibleAnalyticsComponent = ({ domain }: PlausibleAnalyticsProps) => {
  if (!domain) {
    return null
  }

  return (
    <PlausibleProvider
      domain={domain}
      enabled={true}
      trackOutboundLinks={true}
      taggedEvents={true}
    />
  )
}
