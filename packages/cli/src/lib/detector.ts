import { existsSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
// Bundled package mappings (inlined by tsup at build time)
import packageMappings from '../../data/package-mappings.json' with { type: 'json' }
import type { DetectedMatch, PackageMappings } from '../types/index.js'
import { getEntry } from './registry.js'

/**
 * Detect llms.txt matches from package.json dependencies.
 */
export function detectFromPackageJson(projectDir: string): DetectedMatch[] {
  const pkgPath = join(projectDir, 'package.json')
  if (!existsSync(pkgPath)) return []

  let pkg: { dependencies?: Record<string, string>; devDependencies?: Record<string, string> }
  try {
    pkg = JSON.parse(readFileSync(pkgPath, 'utf-8'))
  } catch {
    return []
  }

  const allDeps = {
    ...pkg.dependencies,
    ...pkg.devDependencies
  }

  const mappings: PackageMappings = packageMappings
  const matchesBySlug = new Map<string, string[]>()

  for (const depName of Object.keys(allDeps)) {
    const slug = mappings.npm[depName]
    if (!slug) continue

    const existing = matchesBySlug.get(slug) || []
    existing.push(depName)
    matchesBySlug.set(slug, existing)
  }

  const results: DetectedMatch[] = []
  for (const [slug, matchedPackages] of matchesBySlug) {
    const registryEntry = getEntry(slug)
    if (registryEntry) {
      results.push({ slug, matchedPackages, registryEntry })
    }
  }

  return results
}

/**
 * Filter detected matches by the given category list.
 */
export function filterMatchesByCategories(
  matches: DetectedMatch[],
  categories: string[]
): DetectedMatch[] {
  if (categories.length === 0) return matches
  return matches.filter(m => categories.includes(m.registryEntry.category))
}
