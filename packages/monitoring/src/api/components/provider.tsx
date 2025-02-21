'use client'

import { type PropsWithChildren, lazy } from 'react'

import { getMonitoringProvider } from '../get-monitoring-provider'
import { InstrumentationProvider } from '../monitoring-providers.enum'

const SentryProvider = lazy(async () => {
  const { SentryProvider } = await import('../../sentry/provider')

  return {
    default: SentryProvider
  }
})

export function MonitoringProvider(props: PropsWithChildren) {
  const provider = getMonitoringProvider()

  switch (provider) {
    case InstrumentationProvider.Sentry:
      return <SentryProvider>{props.children}</SentryProvider>

    default:
      return <>{props.children}</>
  }
}
