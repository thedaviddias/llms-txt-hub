import withMDX from '@next/mdx'
import { config as baseConfig } from '@thedaviddias/config-next'

export const INTERNAL_PACKAGES = ['@thedaviddias/design-system', '@thedaviddias/analytics']

/** @type {import('next').NextConfig} */
export const nextConfig = {
  ...baseConfig,

  transpilePackages: INTERNAL_PACKAGES,

  typescript: {
    ignoreBuildErrors: true,
  },

  pageExtensions: ['mdx', 'ts', 'tsx'],

  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'www.google.com',
        pathname: '/s2/favicons/**',
      },
      {
        protocol: 'https',
        hostname: 'avatars.githubusercontent.com',
        pathname: '/**',
      },
    ],
  },
}

export default withMDX()(nextConfig)
