import withBundleAnalyzer from '@next/bundle-analyzer'
import withVercelToolbar from '@vercel/toolbar/plugins/next'
import type { NextConfig } from 'next'
import { withPlausibleProxy } from 'next-plausible'

const otelRegex = /@opentelemetry\/instrumentation/

export const baseConfig: NextConfig = {
  reactStrictMode: true,

  // Ignore ESLint because we use biome for linting
  eslint: {
    ignoreDuringBuilds: true
  },

  webpack(config, { isServer }) {
    if (isServer) {
      config.plugins = config.plugins || []
    }

    config.ignoreWarnings = [{ module: otelRegex }]

    return config
  },

  skipTrailingSlashRedirect: true
}

export const withAnalyzer = (sourceConfig: NextConfig) => withBundleAnalyzer()(sourceConfig)

export const withVercelToolbarConfig = (sourceConfig: NextConfig) =>
  withVercelToolbar()(sourceConfig)

export const withPlausibleProxyConfig = (sourceConfig: NextConfig) =>
  withPlausibleProxy()(sourceConfig)
