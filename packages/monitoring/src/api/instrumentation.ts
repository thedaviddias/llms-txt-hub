import { getMonitoringProvider } from './get-monitoring-provider'

const PROVIDER = getMonitoringProvider()

/**
 * @name registerMonitoringInstrumentation
 * @description Register monitoring instrumentation based on the MONITORING_PROVIDER environment variable.
 *
 * Please set the MONITORING_PROVIDER environment variable to register the monitoring instrumentation provider.
 */
export function registerMonitoringInstrumentation() {
  if (!PROVIDER) {
    return
  }

  return 'sentry'
}
