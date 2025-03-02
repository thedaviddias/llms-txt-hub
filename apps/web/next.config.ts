import { env } from '@/env'
import withMDX from '@next/mdx'
import {
  baseConfig,
  withAnalyzer,
  withPlausibleProxyConfig,
  withVercelToolbarConfig
} from '@thedaviddias/config-next'
import { withSentry } from '@thedaviddias/observability/next-config'
import type { NextConfig } from 'next'

export const INTERNAL_PACKAGES = [
  '@thedaviddias/design-system',
  '@thedaviddias/analytics',
  '@thedaviddias/auth',
  '@thedaviddias/caching',
  '@thedaviddias/config-next',
  '@thedaviddias/config-typescript',
  '@thedaviddias/logging',
  '@thedaviddias/supabase',
  '@thedaviddias/utils'
]

let nextConfig: NextConfig = {
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
  },

  redirects: async () => {
    return [
      {
        source: '/website/:path*',
        destination: '/websites/:path*',
        permanent: true
      }
    ]
  }
}

nextConfig = withPlausibleProxyConfig(nextConfig)

nextConfig = withVercelToolbarConfig(nextConfig)

nextConfig = withSentry(nextConfig)

if (env.ANALYZE === 'true') {
  nextConfig = withAnalyzer(nextConfig)
}

export default withMDX()(nextConfig)
