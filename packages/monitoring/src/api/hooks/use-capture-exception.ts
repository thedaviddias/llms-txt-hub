import { useEffect } from 'react'

import { useMonitoring } from './use-monitoring'

export function useCaptureException(error: Error) {
  const service = useMonitoring()

  useEffect(() => {
    service.captureException(error).catch(console.error)
  }, [error, service])
}
