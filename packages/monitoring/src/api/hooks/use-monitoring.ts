import { useContext } from 'react'

import { MonitoringContext } from '../../core/monitoring.context'

/**
 * @name useMonitoring
 * @description Asynchronously load the monitoring service based on the MONITORING_PROVIDER environment variable.
 * Use Suspense to suspend while loading the service.
 */
export function useMonitoring() {
  const context = useContext(MonitoringContext)
  if (!context) {
    throw new Error('useMonitoring must be used within a MonitoringProvider')
  }
  return context

}
