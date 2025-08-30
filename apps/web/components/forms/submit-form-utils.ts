/**
 * Utility functions for the submit form
 */

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
 * Checks if two URLs belong to the same domain
 */
export function isSameDomain(url1: string, url2: string): boolean {
  const domain1 = normalizeDomain(url1)
  const domain2 = normalizeDomain(url2)
  return domain1 === domain2 && domain1 !== ''
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
export async function checkUrl(
  url: string,
  setStatus: (status: { checking: boolean; accessible: boolean | null; error?: string }) => void
) {
  if (!url) {
    setStatus({ checking: false, accessible: null })
    return false
  }

  setStatus({ checking: true, accessible: null })

  try {
    const response = await fetch('/api/check-url', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ url })
    })

    const result = await response.json()
    setStatus({
      checking: false,
      accessible: result.accessible,
      error: result.error
    })
  } catch (_error) {
    setStatus({
      checking: false,
      accessible: false,
      error: 'Failed to check URL'
    })
  }
}
