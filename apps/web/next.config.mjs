import withMDX from '@next/mdx'
import { baseConfig } from '@thedaviddias/config-next'

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
        pathname: '/**'
      }
    ]
  },

  webpack: config => {
    config.resolve.extensionAlias = {
      '.js': ['.js', '.ts', '.tsx']
    }

    return config
  }
}

export default withMDX()(nextConfig)
