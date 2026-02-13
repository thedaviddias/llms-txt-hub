import Fuse from 'fuse.js'
// Bundled registry (inlined by tsup at build time)
import bundledRegistry from '../../data/registry.json' with { type: 'json' }
import type { RegistryEntry } from '../types/index.js'
import { PRIMARY_CATEGORIES } from '../types/index.js'
import { getCachedRegistry, setCachedRegistry } from './cache.js'

const REMOTE_REGISTRY_URL =
  'https://raw.githubusercontent.com/thedaviddias/llms-txt-hub/main/packages/cli/data/registry.json'

let fuseIndex: Fuse<RegistryEntry> | null = null
let entries: RegistryEntry[] = []

/**
 * Validate that an object looks like a valid RegistryEntry.
 */
function isValidEntry(entry: unknown): entry is RegistryEntry {
  if (typeof entry !== 'object' || entry === null) return false

  if (
    !('slug' in entry) ||
    !('name' in entry) ||
    !('llmsTxtUrl' in entry) ||
    !('category' in entry) ||
    !('description' in entry) ||
    !('domain' in entry)
  ) {
    return false
  }

  const { slug, name, llmsTxtUrl, category, description, domain } = entry

  return (
    typeof slug === 'string' &&
    slug.length > 0 &&
    typeof name === 'string' &&
    name.length > 0 &&
    typeof llmsTxtUrl === 'string' &&
    llmsTxtUrl.length > 0 &&
    typeof category === 'string' &&
    typeof description === 'string' &&
    typeof domain === 'string'
  )
}

/**
 * Build a Fuse.js search index from registry entries.
 */
function buildFuseIndex(data: RegistryEntry[]): Fuse<RegistryEntry> {
  return new Fuse(data, {
    keys: [
      { name: 'name', weight: 0.4 },
      { name: 'slug', weight: 0.3 },
      { name: 'domain', weight: 0.2 },
      { name: 'description', weight: 0.1 }
    ],
    threshold: 0.4,
    includeScore: true
  })
}

/**
 * Load registry entries from cache, remote, or bundled fallback.
 */
export async function loadRegistry(): Promise<RegistryEntry[]> {
  // Try remote cache first
  const cached = getCachedRegistry()
  if (cached && cached.length > 0) {
    entries = cached
    fuseIndex = buildFuseIndex(entries)
    return entries
  }

  // Try fetching fresh registry from GitHub
  try {
    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), 5000)
    const response = await fetch(REMOTE_REGISTRY_URL, {
      signal: controller.signal
    })
    clearTimeout(timeout)

    if (response.ok) {
      const raw: unknown = await response.json()
      if (Array.isArray(raw) && raw.length > 0) {
        const validated = raw.filter(isValidEntry)
        if (validated.length === 0) throw new Error('No valid entries in remote registry')
        entries = validated
        setCachedRegistry(entries)
        fuseIndex = buildFuseIndex(entries)
        return entries
      }
    }
  } catch {
    // Remote fetch failed, fall back to bundled
  }

  // Fall back to bundled snapshot
  const fallback: RegistryEntry[] = bundledRegistry
  entries = fallback
  fuseIndex = buildFuseIndex(entries)
  return entries
}

/**
 * Filter registry entries by the given category list.
 */
export function filterByCategories(items: RegistryEntry[], categories?: string[]): RegistryEntry[] {
  if (!categories || categories.length === 0) return items
  return items.filter(entry => categories.includes(entry.category))
}

/**
 * Return a copy of the primary category list.
 */
export function getPrimaryCategories(): string[] {
  return [...PRIMARY_CATEGORIES]
}

/**
 * Search registry entries using Fuse.js fuzzy matching.
 */
export function searchRegistry(query: string, categories?: string[]): RegistryEntry[] {
  if (!fuseIndex) {
    fuseIndex = buildFuseIndex(entries)
  }
  const results = fuseIndex.search(query)
  const matched = results.map(r => r.item)
  return categories ? filterByCategories(matched, categories) : matched
}

/**
 * Find a registry entry by exact slug match.
 */
export function getEntry(slug: string): RegistryEntry | undefined {
  return entries.find(e => e.slug === slug)
}

/**
 * Return all registry entries, optionally filtered by categories.
 */
export function getAllEntries(categories?: string[]): RegistryEntry[] {
  return categories ? filterByCategories(entries, categories) : entries
}

/**
 * Resolve a name or slug to a registry entry using exact then fuzzy matching.
 */
export function resolveSlug(nameOrSlug: string): RegistryEntry | undefined {
  // Exact slug match first
  const exact = entries.find(e => e.slug === nameOrSlug)
  if (exact) return exact

  // Case-insensitive name match
  const byName = entries.find(e => e.name.toLowerCase() === nameOrSlug.toLowerCase())
  if (byName) return byName

  // Fuzzy match - take the best result
  const results = searchRegistry(nameOrSlug)
  return results[0]
}
