import withBundleAnalyzer from '@next/bundle-analyzer'
import withVercelToolbar from '@vercel/toolbar/plugins/next'

const otelRegex = /@opentelemetry\/instrumentation/

/** @type {import('next').NextConfig} */
export const baseConfig = {
  reactStrictMode: true,
  images: {
    formats: ['image/avif', 'image/webp']
  },

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

export const withAnalyzer = sourceConfig => withBundleAnalyzer()(sourceConfig)

export const withVercelToolbarConfig = sourceConfig => withVercelToolbar(sourceConfig)
