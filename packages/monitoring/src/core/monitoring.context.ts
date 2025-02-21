'use client'

import { createContext } from 'react'

import { ConsoleMonitoringService } from './console-monitoring.service'
import type { MonitoringService } from './monitoring.service'

export const MonitoringContext = createContext<MonitoringService>(
  new ConsoleMonitoringService()
)
