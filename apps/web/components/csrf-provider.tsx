'use client'

import { useEffect } from 'react'

/**
 * Initializes the CSRF token on the client by fetching `/api/csrf` and storing it in a meta tag.
 *
 * Runs once on mount; if the fetched JSON contains a `token`, ensures a `meta[name="csrf-token"]` element exists (creates it if missing) and sets its `content` to the token. This component has no UI.
 *
 * @returns null — this component renders nothing
 */
export function CSRFProvider() {
  useEffect(() => {
    /**
     * Initialize CSRF token by fetching from API and setting meta tag
     */
    const initCSRF = async () => {
      try {
        const response = await fetch('/api/csrf', { method: 'GET' })
        if (response.ok) {
          const data = await response.json()
          if (data.token) {
            // Create or update meta tag
            let metaTag = document.querySelector('meta[name="csrf-token"]')
            if (!metaTag || !(metaTag instanceof HTMLMetaElement)) {
              metaTag = document.createElement('meta')
              if (metaTag instanceof HTMLMetaElement) {
                metaTag.name = 'csrf-token'
                document.head.appendChild(metaTag)
              }
            }
            if (metaTag instanceof HTMLMetaElement) {
              metaTag.content = data.token
            }
          }
        }
      } catch (error) {
        console.error('Failed to initialize CSRF token:', error)
      }
    }

    initCSRF()
  }, [])

  return null
}
