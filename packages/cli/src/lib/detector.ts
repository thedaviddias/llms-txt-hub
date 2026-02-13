import { existsSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import type { DetectedMatch, RegistryEntry } from '../types/index.js'
import { getAllEntries } from './registry.js'

/**
 * Normalize a string for matching: lowercase, strip common suffixes.
 */
function normalize(name: string): string {
  return name.toLowerCase().replace(/[-_./]/g, '')
}

/**
 * Extract candidate tokens from an npm package name for fuzzy matching.
 * E.g. "@stripe/stripe-js" → ["stripe/stripe-js", "stripe-js", "stripe"]
 * E.g. "drizzle-orm" → ["drizzle-orm", "drizzle"]
 * E.g. "@anthropic-ai/sdk" → ["anthropic-ai/sdk", "sdk", "anthropic-ai", "anthropic"]
 */
function extractTokens(dep: string): string[] {
  const tokens: string[] = []

  // Strip scope prefix
  const unscoped = dep.startsWith('@') ? dep.slice(1) : dep
  tokens.push(unscoped)

  // If scoped, add both parts
  if (dep.startsWith('@') && unscoped.includes('/')) {
    const [scope, pkg] = unscoped.split('/')
    tokens.push(pkg)
    tokens.push(scope)
    // Strip common scope suffixes: @astrojs → astro
    const cleanScope = scope.replace(/js$/, '').replace(/-ai$/, '')
    if (cleanScope !== scope) tokens.push(cleanScope)
  }

  // Strip common package suffixes
  for (const suffix of ['-js', '-sdk', '-client', '-core', '-cli', '-types']) {
    if (dep.endsWith(suffix)) {
      tokens.push(dep.slice(0, -suffix.length))
    }
  }

  return tokens
}

/**
 * Check if a dependency name matches a registry entry.
 */
function matchesEntry(dep: string, entry: RegistryEntry): boolean {
  const tokens = extractTokens(dep)
  const entrySlug = entry.slug.toLowerCase()
  const entryName = normalize(entry.name)

  for (const token of tokens) {
    const norm = normalize(token)
    // Exact slug match
    if (norm === entrySlug) return true
    // Exact normalized name match
    if (norm === entryName) return true
    // Slug contains the token (e.g. dep "stripe" matches slug "stripe")
    if (entrySlug === norm) return true
    // Entry name starts with token (e.g. dep "prisma" matches name "Prisma ORM")
    if (entryName.startsWith(norm) && norm.length >= 3) return true
  }

  return false
}

/**
 * Detect llms.txt matches from package.json dependencies.
 * Matches dependency names against registry entry slugs and names.
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

  const depNames = Object.keys({
    ...pkg.dependencies,
    ...pkg.devDependencies
  })

  if (depNames.length === 0) return []

  const entries = getAllEntries()
  const matchesBySlug = new Map<string, { deps: string[]; entry: RegistryEntry }>()

  for (const dep of depNames) {
    for (const entry of entries) {
      if (matchesEntry(dep, entry)) {
        const existing = matchesBySlug.get(entry.slug)
        if (existing) {
          existing.deps.push(dep)
        } else {
          matchesBySlug.set(entry.slug, { deps: [dep], entry })
        }
        break // One dep matches one entry at most
      }
    }
  }

  return [...matchesBySlug.values()].map(({ deps, entry }) => ({
    slug: entry.slug,
    matchedPackages: deps,
    registryEntry: entry
  }))
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
