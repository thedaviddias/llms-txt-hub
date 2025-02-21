import type { InstrumentationProvider } from './monitoring-providers.enum'

export function getMonitoringProvider() {
  return process.env.NEXT_PUBLIC_MONITORING_PROVIDER as
    | InstrumentationProvider
    | undefined
}
