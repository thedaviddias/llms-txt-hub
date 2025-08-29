import { withContentCollections } from '@content-collections/next'
import withMDX from '@next/mdx'
import {
  baseConfig,
  withAnalyzer,
  withPlausibleProxyConfig,
  withVercelToolbarConfig
} from '@thedaviddias/config-next'
import { withSentry } from '@thedaviddias/observability/next-config'
import type { NextConfig } from 'next'
import { env } from '@/env'

export const INTERNAL_PACKAGES = [
  '@thedaviddias/design-system',
  '@thedaviddias/analytics',
  '@thedaviddias/auth',
  '@thedaviddias/caching',
  '@thedaviddias/config-next',
  '@thedaviddias/config-typescript',
  '@thedaviddias/logging',
  '@thedaviddias/utils',
  '@thedaviddias/content'
]

let nextConfig: NextConfig = {
  ...baseConfig,

  transpilePackages: INTERNAL_PACKAGES,

  pageExtensions: ['mdx', 'ts', 'tsx'],

  // Configure Turbopack to support MDX and other extensions
  turbopack: {
    resolveExtensions: ['.mdx', '.tsx', '.ts', '.jsx', '.js', '.mjs', '.json']
  },

  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'www.google.com',
        pathname: '/s2/favicons/**'
      },
      {
        protocol: 'https',
        hostname: 't0.gstatic.com',
        pathname: '/faviconV2/**'
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
      },
      {
        // Redirect old website URLs to new ones with -llms-txt suffix
        source: '/websites/:slug((?!.*-llms-txt).*)',
        destination: '/websites/:slug-llms-txt',
        permanent: true
      }
    ]
  }
}

// Apply other plugins first
nextConfig = withPlausibleProxyConfig(nextConfig)
nextConfig = withVercelToolbarConfig(nextConfig)
nextConfig = withSentry(nextConfig)
nextConfig = withMDX()(nextConfig)

if (env.ANALYZE === 'true') {
  nextConfig = withAnalyzer(nextConfig)
}

// withContentCollections must be the outermost wrapper
export default withContentCollections(nextConfig)
