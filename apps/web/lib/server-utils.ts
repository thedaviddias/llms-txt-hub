import 'server-only'
import fs from 'node:fs'
import path from 'node:path'

/**
 * Resolves a path relative to the monorepo root
 * Server-side only utility function
 *
 * @param relativePath - Path relative to the monorepo root
 * @returns Absolute path from the monorepo root
 */
export function resolveFromRoot(relativePath: string): string {
  // Special case for data directory which might be at project root
  if (relativePath === 'data' || relativePath.startsWith('data/')) {
    // Check multiple possible locations for the data directory
    const possibleDataPaths = [
      // For Vercel environments
      path.join(process.cwd(), relativePath),
      // For monorepo root
      path.join(process.cwd(), '..', '..', relativePath),
      path.join(process.cwd(), '..', relativePath),
      // For app-specific locations
      path.join(process.cwd(), 'apps', 'web', relativePath)
    ]

    for (const p of possibleDataPaths) {
      if (fs.existsSync(p)) {
        // Development debug: Found file at path
        return p
      }
    }
  }

  // Standard path resolution logic
  if (process.env.VERCEL) {
    // Try the direct path first (content at root level)
    const directPath = path.join(process.cwd(), relativePath)
    if (fs.existsSync(directPath)) {
      return directPath
    }

    // Try the app-relative path next (content inside apps/web)
    const appPath = path.join(process.cwd(), 'apps', 'web', relativePath)
    if (fs.existsSync(appPath)) {
      return appPath
    }

    // Default to direct path even if it doesn't exist
    return directPath
  }

  // Local development path
  return path.join(process.cwd(), '..', '..', relativePath)
}

/**
 * Resolve paths from project root (server-only)
 */
export function resolveFromProjectRoot(...paths: string[]): string {
  return path.resolve(process.cwd(), ...paths)
}
