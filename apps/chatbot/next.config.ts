import { env } from '@/env'
import { baseConfig, withAnalyzer } from '@thedaviddias/config-next'
import type { NextConfig } from 'next'

export const INTERNAL_PACKAGES = [
  '@thedaviddias/design-system',
  '@thedaviddias/config-next',
  '@thedaviddias/config-typescript',
  '@thedaviddias/utils'
]

let nextConfig: NextConfig = {
  ...baseConfig,

  transpilePackages: INTERNAL_PACKAGES,

  pageExtensions: ['ts', 'tsx']
}

if (env.ANALYZE === 'true') {
  nextConfig = withAnalyzer(nextConfig)
}

export default nextConfig
