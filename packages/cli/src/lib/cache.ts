import { existsSync, mkdirSync, readFileSync, statSync, writeFileSync } from 'node:fs'
import { homedir } from 'node:os'
import { join } from 'node:path'
import type { RegistryEntry } from '../types/index.js'

const CACHE_DIR = join(homedir(), '.cache', 'llmstxt')
const CACHE_FILE = join(CACHE_DIR, 'registry.json')
const CACHE_TTL_MS = 24 * 60 * 60 * 1000 // 24 hours

/**
 * Ensure the cache directory exists on disk.
 */
function ensureCacheDir(): void {
  mkdirSync(CACHE_DIR, { recursive: true })
}

/**
 * Return cached registry entries if the cache is fresh, or null.
 */
export function getCachedRegistry(): RegistryEntry[] | null {
  try {
    if (!existsSync(CACHE_FILE)) return null
    const stat = statSync(CACHE_FILE)
    const age = Date.now() - stat.mtimeMs
    if (age > CACHE_TTL_MS) return null

    const raw = readFileSync(CACHE_FILE, 'utf-8')
    const parsed: unknown = JSON.parse(raw)
    if (!Array.isArray(parsed)) return null
    // Each element is validated by the caller (validateRegistryData in registry.ts)
    const entries: RegistryEntry[] = parsed
    return entries
  } catch {
    return null
  }
}

/**
 * Persist registry entries to the local cache file.
 */
export function setCachedRegistry(entries: RegistryEntry[]): void {
  try {
    ensureCacheDir()
    writeFileSync(CACHE_FILE, JSON.stringify(entries), 'utf-8')
  } catch {
    // cache write failure is non-fatal
  }
}
