import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'

interface PackageManifest {
  dependencies?: Record<string, string>
  packageManager?: string
}

interface TurboConfig {
  tasks: {
    build: {
      env: string[]
    }
  }
}

function readJson<T>(path: string): T {
  return JSON.parse(readFileSync(path, 'utf8'))
}

describe('production deployment dependencies', () => {
  it('provides public Clerk configuration to browser CI without exposing its secret', () => {
    const workflow = readFileSync('.github/workflows/pr-review.yml', 'utf8')

    const publicKeyExpression = '$' + '{{ vars.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY }}'
    expect(workflow).toContain(`NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY: ${publicKeyExpression}`)
    expect(workflow).toContain("E2E_PUBLIC_ROUTES: '1'")
    expect(workflow).not.toContain('CLERK_SECRET_KEY: ${{')
  })

  it.each([
    {
      dependencies: ['@clerk/backend', '@sentry/nextjs', 'tailwind-merge'],
      manifestPath: 'apps/web/package.json'
    },
    {
      dependencies: ['zod'],
      manifestPath: 'packages/caching/package.json'
    },
    {
      dependencies: ['zod'],
      manifestPath: 'packages/logging/package.json'
    }
  ])(
    '$manifestPath declares its directly imported runtime dependencies',
    ({ dependencies, manifestPath }) => {
      const manifest = readJson<PackageManifest>(manifestPath)

      expect(Object.keys(manifest.dependencies ?? {})).toEqual(expect.arrayContaining(dependencies))
    }
  )

  it('keeps the Vercel build on the repository pnpm version', () => {
    const manifest = readJson<PackageManifest>('package.json')
    const turboConfig = readJson<TurboConfig>('turbo.json')

    expect(manifest.packageManager).toBe('pnpm@10.7.1')
    expect(turboConfig.tasks.build.env).toContain('ENABLE_EXPERIMENTAL_COREPACK')
  })
})
