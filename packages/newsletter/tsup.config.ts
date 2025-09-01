import { defineConfig } from 'tsup'

export default defineConfig({
  entry: ['src/index.ts', 'src/keys.ts'],
  format: ['cjs', 'esm'],
  dts: true,
  splitting: false,
  sourcemap: true,
  clean: true,
  external: ['@sentry/nextjs', '@thedaviddias/logging', '@t3-oss/env-nextjs']
})
