import path from 'node:path'
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
  return path.join(process.cwd(), '..', '..', relativePath)
}
