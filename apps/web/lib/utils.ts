import path from 'node:path'
import fs from 'node:fs'
import { type ClassValue, clsx } from 'clsx'
import { format } from 'date-fns'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatDate(dateString: string): string {
  const date = new Date(dateString)
  if (Number.isNaN(date.getTime())) {
    return 'Invalid date'
  }
  return format(date, 'MMMM d, yyyy')
}

/**
 * Resolves a path relative to the monorepo root
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
    ];
    
    for (const p of possibleDataPaths) {
      if (fs.existsSync(p)) {
        console.log(`Found ${relativePath} at: ${p}`);
        return p;
      }
    }
  }
  
  // Standard path resolution logic
  if (process.env.VERCEL) {
    // Try the direct path first (content at root level)
    const directPath = path.join(process.cwd(), relativePath);
    if (fs.existsSync(directPath)) {
      return directPath;
    }
    
    // Try the app-relative path next (content inside apps/web)
    const appPath = path.join(process.cwd(), 'apps', 'web', relativePath);
    if (fs.existsSync(appPath)) {
      return appPath;
    }
    
    // Default to direct path even if it doesn't exist
    return directPath;
  }
  
  // Local development path
  return path.join(process.cwd(), '..', '..', relativePath);
}
