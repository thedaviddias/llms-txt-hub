import { logger } from '@thedaviddias/logging'

export class ConsoleMonitoringService {
  captureException(error: Error) {
    logger.error('[Console Monitoring] Caught exception:', { data: error })
  }

  captureEvent(event: string) {
    logger.info(`[Console Monitoring] Captured event: ${event}`)
  }
}
