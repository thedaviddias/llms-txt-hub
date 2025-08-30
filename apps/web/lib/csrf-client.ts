'use client'

const CSRF_HEADER_NAME = 'x-csrf-token'

/**
 * Get CSRF token from meta tag for client-side usage
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
 * Add CSRF token to fetch requests automatically
 * This is the client-side version that can be used in React components
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
