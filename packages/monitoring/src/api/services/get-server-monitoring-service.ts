import { ConsoleMonitoringService } from '../../core/console-monitoring.service'
import { getMonitoringProvider } from '../get-monitoring-provider'
import { InstrumentationProvider } from '../monitoring-providers.enum'

const MONITORING_PROVIDER = getMonitoringProvider()

/**
 * @name getServerMonitoringService
 * @description Get the monitoring service based on the MONITORING_PROVIDER environment variable.
 */
export async function getServerMonitoringService() {
  if (!MONITORING_PROVIDER) {
    // biome-ignore lint: we want to log this
    console.info(
      'No instrumentation provider specified. Returning console service...'
    )

    return new ConsoleMonitoringService()
  }

  switch (MONITORING_PROVIDER) {
    case InstrumentationProvider.Sentry: {
      const { SentryMonitoringService } = await import('../../sentry')

      return new SentryMonitoringService()
    }

    default: {
      throw new Error(
        'Please set the MONITORING_PROVIDER environment variable to register the monitoring instrumentation provider.'
      )
    }
  }
}
