/**
 * Utility functions for the submit form
 */

import { areUrlsInSameSiteFamily } from '@thedaviddias/submission-trust/site-family'
import { fetchWithCSRF } from '@/lib/csrf-client'

const URL_CHECK_ERROR = 'Unable to check this URL. Please try again.'

/**
 * Normalizes a domain by removing protocol, www prefix, and handling edge cases
 */
export function normalizeDomain(url: string): string {
  try {
    // Clean URL by removing whitespace and newline characters
    const cleanedUrl = url ? url.trim().replace(/[\r\n\t]/g, '') : ''
    if (!cleanedUrl) return ''

    const parsedUrl = new URL(cleanedUrl)
    let hostname = parsedUrl.hostname.toLowerCase()

    // Remove www prefix
    hostname = hostname.replace(/^www\./, '')

    // Handle localhost and development environments
    if (
      hostname === 'localhost' ||
      hostname.match(/^127\.0\.0\.1$/) ||
      hostname.match(/^192\.168\./)
    ) {
      return hostname + (parsedUrl.port ? `:${parsedUrl.port}` : '')
    }

    return hostname
  } catch {
    return ''
  }
}

/**
 * Checks if two URLs belong to the same registrable site family
 */
export function isSameDomain(url1: string, url2: string): boolean {
  return areUrlsInSameSiteFamily(url1, url2)
}

/**
 * Generates a llms.txt URL from a website URL
 */
export function generateLlmsUrl(websiteUrl: string): string {
  if (!websiteUrl) return ''
  try {
    const cleanedUrl = websiteUrl.trim().replace(/[\r\n\t]/g, '')
    const url = new URL(cleanedUrl)
    return `${url.origin}/llms.txt`
  } catch {
    return ''
  }
}

/**
 * Generates a llms-full.txt URL from a website URL
 */
export function generateLlmsFullUrl(websiteUrl: string): string {
  if (!websiteUrl) return ''
  try {
    const cleanedUrl = websiteUrl.trim().replace(/[\r\n\t]/g, '')
    const url = new URL(cleanedUrl)
    return `${url.origin}/llms-full.txt`
  } catch {
    return ''
  }
}

/**
 * Checks if a URL is accessible
 */
export async function checkUrl(url: string, signal?: AbortSignal) {
  if (!url) {
    return { checking: false, accessible: null }
  }

  try {
    const response = await fetchWithCSRF('/api/check-url', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ url }),
      signal
    })

    const result: unknown = await response.json()
    if (typeof result !== 'object' || result === null) {
      return { checking: false, accessible: false, error: URL_CHECK_ERROR }
    }

    const accessible = response.ok && 'accessible' in result && result.accessible === true
    const error =
      'error' in result && typeof result.error === 'string' ? result.error.trim() : undefined
    return {
      checking: false,
      accessible,
      error: error || (accessible ? undefined : URL_CHECK_ERROR)
    }
  } catch (_error) {
    return {
      checking: false,
      accessible: false,
      error: URL_CHECK_ERROR
    }
  }
}
