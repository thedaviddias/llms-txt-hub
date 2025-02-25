import withMDX from '@next/mdx'
import { env } from '@thedaviddias/config-environment'
import {
  baseConfig,
  withAnalyzer,
  withPlausibleProxyConfig,
  withVercelToolbarConfig
} from '@thedaviddias/config-next'

export const INTERNAL_PACKAGES = [
  '@thedaviddias/design-system',
  '@thedaviddias/analytics',
  '@thedaviddias/auth',
  '@thedaviddias/caching',
  '@thedaviddias/config-environment',
  '@thedaviddias/config-next',
  '@thedaviddias/config-typescript',
  '@thedaviddias/logging',
  '@thedaviddias/supabase',
  '@thedaviddias/utils'
]

/** @type {import('next').NextConfig} */
let nextConfig = {
  ...baseConfig,

  transpilePackages: INTERNAL_PACKAGES,

  pageExtensions: ['mdx', 'ts', 'tsx'],

  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'www.google.com',
        pathname: '/s2/favicons/**'
      },
      {
        protocol: 'https',
        hostname: 'avatars.githubusercontent.com',
        pathname: '/u/**'
      }
    ]
  }
}

nextConfig = withVercelToolbarConfig(nextConfig)

if (env.ANALYZE === 'true') {
  nextConfig = withAnalyzer(nextConfig)
}

nextConfig = withPlausibleProxyConfig(nextConfig)

export default withMDX()(nextConfig)
