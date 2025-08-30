'use client'

const CSRF_HEADER_NAME = 'x-csrf-token'

/**
 * Returns the CSRF token read from the document meta tag `meta[name="csrf-token"]`.
 *
 * This is safe to call during server-side rendering — it returns an empty string when `window`
 * is unavailable or when the meta tag (or its `content`) is missing.
 *
 * @returns The CSRF token string, or an empty string if not found or not running in a browser.
 */
export function getCSRFTokenForClient(): string {
  if (typeof window === 'undefined') {
    return ''
  }

  // Try to get from meta tag first
  const metaTag = document.querySelector('meta[name="csrf-token"]')
  if (metaTag) {
    return metaTag.getAttribute('content') || ''
  }

  return ''
}

/**
 * Performs a fetch request and automatically attaches the CSRF token when appropriate.
 *
 * If a client-side CSRF token is available (read via `getCSRFTokenForClient()`) and the request
 * method is not `GET` or `HEAD`, the header `x-csrf-token` will be added to the request.
 *
 * Note: this function may mutate the supplied `options` object by assigning `options.headers`.
 *
 * @param url - Request URL
 * @param options - Fetch options; headers will be merged with the CSRF header when added
 * @returns A promise that resolves to the fetch Response
 */
export function fetchWithCSRF(url: string, options: RequestInit = {}): Promise<Response> {
  const token = getCSRFTokenForClient()

  if (token && !['GET', 'HEAD'].includes(options.method || 'GET')) {
    options.headers = {
      ...options.headers,
      [CSRF_HEADER_NAME]: token
    }
  }

  return fetch(url, options)
}
