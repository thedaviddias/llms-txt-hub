import withBundleAnalyzer from '@next/bundle-analyzer'
import withVercelToolbar from '@vercel/toolbar/plugins/next'
import type { NextConfig } from 'next'
import { withPlausibleProxy } from 'next-plausible'

export const baseConfig: NextConfig = {
  reactStrictMode: true,
  skipTrailingSlashRedirect: true
}

/**
 * Wraps a Next.js config with bundle analyzer support
 */
export const withAnalyzer = (sourceConfig: NextConfig) => withBundleAnalyzer()(sourceConfig)

/**
 * Wraps a Next.js config with Vercel toolbar support
 */
export const withVercelToolbarConfig = (sourceConfig: NextConfig) =>
  withVercelToolbar()(sourceConfig)

/**
 * Wraps a Next.js config with Plausible analytics proxy support
 */
export const withPlausibleProxyConfig = (sourceConfig: NextConfig) =>
  withPlausibleProxy()(sourceConfig)
