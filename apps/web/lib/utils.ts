import { type ClassValue, clsx } from 'clsx'
import { format, formatDistanceToNow } from 'date-fns'
import { twMerge } from 'tailwind-merge'

/**
 * Combines class names using clsx and tailwind-merge
 */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * Format a date string to a human-readable format
 */
export function formatDate(dateString: string): string {
  const date = new Date(dateString)
  if (Number.isNaN(date.getTime())) {
    return 'Invalid date'
  }
  return format(date, 'MMMM d, yyyy')
}

/**
 * Formats a date string to human-readable relative time using formatDistanceToNow.
 * Returns 'Invalid date' for invalid input, preserving the current behavior.
 *
 * @param dateString - String representation of a date
 * @returns string - Human-readable relative time (e.g., "2 days ago") or 'Invalid date' for invalid input
 */
export function formatRelativeDate(dateString: string): string {
  const date = new Date(dateString)
  if (Number.isNaN(date.getTime())) {
    return 'Invalid date'
  }
  return formatDistanceToNow(date, { addSuffix: true })
}

/**
 * Extracts the hostname from a URL string, removing the 'www.' prefix if present.
 * Returns an empty string for invalid URLs or parse failures.
 *
 * @param url - The input URL or string to parse
 * @returns string - The extracted domain (without 'www.') or empty string on parse failure
 */
export function extractDomain(url: string): string {
  try {
    const urlObj = new URL(url)
    return urlObj.hostname.replace('www.', '')
  } catch {
    return ''
  }
}

/**
 * Strips HTML tags from a string to create safe plain text
 * Useful for sanitizing descriptions that may contain raw HTML
 *
 * @param html - The HTML string to sanitize
 * @returns Plain text with HTML tags removed
 */
export function stripHtmlTags(html: string | null | undefined): string {
  if (!html) return ''
  return html.replace(/<[^>]*>/g, '').trim()
}

// Server-only utilities have been moved to lib/server-utils.ts
// This file should only contain isomorphic utilities that work on both client and server
