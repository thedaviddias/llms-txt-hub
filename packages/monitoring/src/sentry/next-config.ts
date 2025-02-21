import { withSentryConfig } from '@sentry/nextjs'
import type { NextConfig } from 'next'

export const withSentryNextConfig = (sourceConfig: NextConfig): NextConfig =>
  withSentryConfig(sourceConfig, {
    org: process.env.SENTRY_ORG,
    project: process.env.SENTRY_PROJECT,
    silent: !process.env.CI,
    widenClientFileUpload: true,
    tunnelRoute: '/monitoring',
    hideSourceMaps: true,
    disableLogger: true,
    automaticVercelMonitors: true
  })
